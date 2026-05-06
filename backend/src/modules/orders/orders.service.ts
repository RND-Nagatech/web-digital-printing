import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { OrderStatus } from '../../common/enums/order-status.enum';
import { MaterialsService } from '../materials/materials.service';
import { CashDailyService } from '../cash-daily/cash-daily.service';
import { SettingsService } from '../settings/settings.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { Order } from './schemas/order.schema';

@Injectable()
export class OrdersService {
  constructor(
    @InjectModel(Order.name) private readonly model: Model<Order>,
    private readonly materialsService: MaterialsService,
    private readonly cashDailyService: CashDailyService,
    private readonly settingsService: SettingsService,
  ) { }

  /** Returns YYYYMMDD string in WIB (UTC+7) */
  private getWibDateString(): string {
    const now = new Date();
    const wib = new Date(now.getTime() + 7 * 60 * 60 * 1000);
    return wib.toISOString().slice(0, 10).replace(/-/g, '');
  }

  private getWibNow(): Date {
    const now = new Date();
    return new Date(now.getTime() + 7 * 60 * 60 * 1000);
  }

  private formatIDR(amount: number) {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Math.max(0, amount || 0));
  }

  private escapeRegex(value: string) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private normalizePaymentStatus(status?: string): 'unpaid' | 'dp' | 'paid' {
    const v = (status ?? '').toLowerCase();
    if (v === 'paid' || v === 'lunas') return 'paid';
    if (v === 'dp' || v === 'partial_paid') return 'dp';
    if (v === 'unpaid' || v === 'waiting_payment' || v === 'belum_bayar') return 'unpaid';
    return 'unpaid';
  }

  private withNormalizedPaymentStatus<T extends { payment_status?: string }>(row: T): T & { payment_status: 'unpaid' | 'dp' | 'paid' } {
    return {
      ...row,
      payment_status: this.normalizePaymentStatus(row.payment_status),
    };
  }

  private async autoCancelExpiredUnpaid() {
    const policy = await this.settingsService.getOrderPolicy();
    const expiryMs = policy.unpaid_expiry_hours * 60 * 60 * 1000;
    const cutoff = new Date(Date.now() - expiryMs);

    await this.model.updateMany(
      {
        payment_status: 'unpaid',
        status: { $nin: [OrderStatus.CANCELLED, OrderStatus.SELESAI] },
        created_at: { $lte: cutoff },
      },
      { $set: { status: OrderStatus.CANCELLED, updated_date: new Date(), update_by: 'system:auto-cancel' } },
    );
  }

  /**
   * Generates no_faktur format: ORD-YYYYMMDD-XXXX.
   * Counter is per-day, retries on duplicate to handle race conditions.
   */
  private async generateNoFaktur(): Promise<string> {
    const dateStr = this.getWibDateString();
    const startOfDay = new Date(
      `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}T00:00:00+07:00`,
    );
    const endOfDay = new Date(startOfDay.getTime() + 86_400_000);

    for (let attempt = 0; attempt < 10; attempt++) {
      const count = await this.model.countDocuments({
        created_at: { $gte: startOfDay, $lt: endOfDay },
      });
      const candidate = `ORD-${dateStr}-${String(count + 1 + attempt).padStart(4, '0')}`;
      const exists = await this.model.exists({ no_faktur: candidate });
      if (!exists) return candidate;
    }
    throw new BadRequestException('Gagal generate nomor faktur, coba lagi');
  }

  async findAll(
    page = 1,
    limit = 20,
    search?: string,
    status?: string,
    date?: string,
    dateStart?: string,
    dateEnd?: string,
    paymentStatus?: string,
  ) {
    await this.autoCancelExpiredUnpaid();
    const query: Record<string, any> = {};
    if (status && status !== 'all') query.status = status;
    if (paymentStatus && paymentStatus !== 'all') query.payment_status = paymentStatus;
    if (dateStart || dateEnd) {
      if (!dateStart || !dateEnd) {
        throw new BadRequestException('Tanggal awal dan tanggal akhir wajib diisi');
      }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStart) || !/^\d{4}-\d{2}-\d{2}$/.test(dateEnd)) {
        throw new BadRequestException('Format tanggal tidak valid. Gunakan YYYY-MM-DD');
      }

      const startDate = new Date(`${dateStart}T00:00:00+07:00`);
      const endDateStart = new Date(`${dateEnd}T00:00:00+07:00`);
      if (startDate.getTime() > endDateStart.getTime()) {
        throw new BadRequestException('Tanggal awal tidak boleh lebih besar dari tanggal akhir');
      }
      const endDateExclusive = new Date(endDateStart.getTime() + 86_400_000);
      query.created_at = { $gte: startDate, $lt: endDateExclusive };
    } else if (date) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        throw new BadRequestException('Format tanggal tidak valid. Gunakan YYYY-MM-DD');
      }
      const startDate = new Date(`${date}T00:00:00+07:00`);
      const endDate = new Date(startDate.getTime() + 86_400_000);
      query.created_at = { $gte: startDate, $lt: endDate };
    }
    if (search?.trim()) {
      const normalizedSearch = search.trim();
      const escaped = this.escapeRegex(normalizedSearch);
      const re = new RegExp(escaped, 'i');
      const isOrderCode = /^ORD-\d{8}-\d{4}$/i.test(normalizedSearch);
      query.$or = isOrderCode
        ? [{ no_faktur: new RegExp(`^${escaped}$`, 'i') }]
        : [{ no_faktur: re }, { nama_customer: re }, { no_hp: re }];
    }
    const skip = (page - 1) * limit;
    const [itemsRaw, total] = await Promise.all([
      this.model.find(query).sort({ created_at: -1 }).skip(skip).limit(limit).lean(),
      this.model.countDocuments(query),
    ]);
    const items = itemsRaw.map((row) => this.withNormalizedPaymentStatus(row));
    return { items, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async findById(id: string) {
    const data = await this.model.findById(id).lean();
    if (!data) throw new NotFoundException('Order not found');
    return this.withNormalizedPaymentStatus(data);
  }

  async findMyOrders(kodeCustomer: string, page = 1, limit = 20, status?: string, paymentStatus?: string) {
    await this.autoCancelExpiredUnpaid();
    const query: Record<string, any> = { kode_customer: kodeCustomer };
    if (status && status !== 'all') query.status = status;
    if (paymentStatus && paymentStatus !== 'all') query.payment_status = paymentStatus;

    const skip = (page - 1) * limit;
    const [itemsRaw, total] = await Promise.all([
      this.model.find(query).sort({ created_at: -1 }).skip(skip).limit(limit).lean(),
      this.model.countDocuments(query),
    ]);
    const items = itemsRaw.map((row) => this.withNormalizedPaymentStatus(row));

    return {
      items,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async create(dto: CreateOrderDto, designFile?: string, paymentProof?: string) {
    await this.autoCancelExpiredUnpaid();
    const policy = await this.settingsService.getOrderPolicy();
    const customerPolicy = dto.kode_customer
      ? await this.settingsService.getOrderPolicyForCustomer(dto.kode_customer)
      : undefined;

    if (dto.kode_customer && dto.payment_method === 'pay_later' && policy.max_unpaid_orders > 0) {
      if (customerPolicy && customerPolicy.can_pay_later === false) {
        throw new BadRequestException('Metode Bayar Nanti sedang dibatasi sementara karena pembatalan otomatis berulang.');
      }
      const unpaidCount = await this.model.countDocuments({
        kode_customer: dto.kode_customer,
        payment_status: 'unpaid',
        status: { $nin: [OrderStatus.CANCELLED, OrderStatus.SELESAI] },
      });
      if (unpaidCount >= policy.max_unpaid_orders) {
        throw new BadRequestException(`Maksimal ${policy.max_unpaid_orders} pesanan belum dibayar. Silakan selesaikan pembayaran pesanan sebelumnya.`);
      }
    }

    const itemInputs = dto.items?.length
      ? dto.items
      : (dto.kode_bahan && dto.panjang && dto.lebar && dto.quantity
        ? [{
          kode_bahan: dto.kode_bahan,
          panjang: dto.panjang,
          lebar: dto.lebar,
          quantity: dto.quantity,
          mata_ayam: dto.mata_ayam,
        }]
        : []);

    if (itemInputs.length === 0) {
      throw new BadRequestException('Item order wajib diisi');
    }

    const itemMaterials = await Promise.all(
      itemInputs.map((item) => this.materialsService.findByCode(item.kode_bahan)),
    );

    const items = itemInputs.map((item, idx) => {
      const material = itemMaterials[idx];
      const area = parseFloat((item.panjang * item.lebar).toFixed(4));
      const hargaSatuan = Math.round(material.price_per_meter * area);
      const subtotal = hargaSatuan * item.quantity;
      return {
        kode_bahan: item.kode_bahan,
        nama_bahan: material.name,
        panjang: item.panjang,
        lebar: item.lebar,
        area,
        mata_ayam: item.mata_ayam ?? '',
        design_file: item.design_file ?? '',
        quantity: item.quantity,
        harga_satuan: hargaSatuan,
        subtotal,
      };
    });

    const harga_total = items.reduce((sum, item) => sum + item.subtotal, 0);
    const firstItem = items[0];

    let payment_status: 'unpaid' | 'dp' | 'paid' = 'unpaid';
    let payment_settlement_method: 'transfer' | 'cash' | undefined;
    let dp_amount = 0;
    let sisa = 0;
    let dibayar = 0;

    if (dto.payment_method === 'pay_now' || dto.payment_method === 'dp') {
      const channel: 'transfer' | 'cash' = dto.payment_channel ?? (paymentProof ? 'transfer' : 'cash');
      if (channel === 'transfer' && !paymentProof) {
        throw new BadRequestException('Bukti transfer wajib diupload untuk metode ini');
      }

      payment_settlement_method = channel;

      if (dto.payment_method === 'pay_now') {
        payment_status = 'paid';
        dp_amount = harga_total;
        dibayar = harga_total;
        sisa = 0;
      } else {
        if (!dto.dp_amount || dto.dp_amount <= 0) {
          throw new BadRequestException('Masukkan jumlah DP');
        }
        if (dto.dp_amount >= harga_total) {
          throw new BadRequestException('Jumlah DP harus lebih kecil dari total transaksi');
        }
        payment_status = 'dp';
        dp_amount = dto.dp_amount;
        dibayar = dto.dp_amount;
        sisa = harga_total - dto.dp_amount;
      }
    } else {
      // Backward compatibility for checkout payloads that don't send payment_method.
      const isDp = !!paymentProof && !!dto.dp_amount && dto.dp_amount > 0 && dto.dp_amount < harga_total;
      const isFullPaid = !!paymentProof && !isDp;
      payment_status = isDp ? 'dp' : isFullPaid ? 'paid' : 'unpaid';
      payment_settlement_method = paymentProof ? 'transfer' : undefined;
      dp_amount = isDp ? dto.dp_amount! : isFullPaid ? harga_total : 0;
      sisa = isDp ? harga_total - dto.dp_amount! : 0;
      dibayar = isDp ? dp_amount : isFullPaid ? harga_total : 0;
    }
    const no_faktur = await this.generateNoFaktur();

    const createdAt = new Date();
    const order = await this.model.create({
      no_faktur,
      kode_customer: dto.kode_customer,
      nama_customer: dto.nama_customer,
      no_hp: dto.no_hp,
      alamat: dto.alamat,
      // Legacy top-level fields are still populated from first item for backward compatibility.
      kode_bahan: firstItem.kode_bahan,
      panjang: firstItem.panjang,
      lebar: firstItem.lebar,
      area: firstItem.area,
      mata_ayam: firstItem.mata_ayam,
      quantity: firstItem.quantity,
      design_file: designFile ?? firstItem.design_file,
      harga_total,
      status: OrderStatus.OPEN,
      payment_proof: paymentProof,
      payment_status,
      payment_settlement_method,
      dp_amount,
      sisa,
      dibayar,
      created_at: createdAt,
      items,
    });
    // Record initial payment in tt_cash_daily
    if (dp_amount > 0) {
      await this.cashDailyService.recordMovement(createdAt, 'in', dp_amount);
    }
    return order;
  }

  async updateStatus(id: string, dto: UpdateOrderStatusDto, updatedBy?: string) {
    await this.autoCancelExpiredUnpaid();
    const policy = await this.settingsService.getOrderPolicy();
    const current = await this.model.findById(id).lean();
    if (!current) throw new NotFoundException('Order not found');
    if (current.status === OrderStatus.CANCELLED) {
      throw new BadRequestException('Pesanan dibatalkan. Status pengerjaan tidak dapat diubah.');
    }
    const currentPaymentStatus = this.normalizePaymentStatus(current.payment_status);

    const nextProdStatuses = [OrderStatus.PROCESSING, OrderStatus.PRINTING, OrderStatus.SELESAI];
    if (nextProdStatuses.includes(dto.status)) {
      if (currentPaymentStatus === 'unpaid') {
        const expiredAt = new Date(current.created_at).getTime() + policy.unpaid_expiry_hours * 60 * 60 * 1000;
        if (Date.now() > expiredAt) {
          await this.model.updateOne(
            { _id: id },
            { $set: { status: OrderStatus.CANCELLED, updated_date: new Date(), update_by: updatedBy ?? 'system:auto-cancel' } },
          );
          throw new BadRequestException('Pesanan melewati batas waktu pembayaran dan sudah dibatalkan otomatis.');
        }
        if (!policy.allow_process_unpaid) {
          throw new BadRequestException('Pesanan belum dibayar. Ubah pengaturan jika ingin mengizinkan proses tanpa pembayaran.');
        }
      }

      if (currentPaymentStatus === 'dp' && !policy.allow_process_dp) {
        throw new BadRequestException('Pesanan DP tidak diizinkan diproses berdasarkan pengaturan.');
      }
    }

    const data = await this.model
      .findByIdAndUpdate(
        id,
        { status: dto.status, updated_date: new Date(), update_by: updatedBy ?? 'system' },
        { new: true },
      )
      .lean();
    if (!data) throw new NotFoundException('Order not found');
    return this.withNormalizedPaymentStatus(data);
  }

  async uploadPaymentProof(id: string, paymentProof: string, updatedBy?: string) {
    const order = await this.model.findById(id).lean();
    if (!order) throw new NotFoundException('Order not found');
    if (order.status === OrderStatus.CANCELLED) {
      throw new BadRequestException('Pesanan dibatalkan. Pembayaran tidak dapat diproses.');
    }
    const currentPaymentStatus = this.normalizePaymentStatus(order.payment_status);
    if (currentPaymentStatus === 'paid') {
      throw new BadRequestException('Order sudah lunas');
    }
    const pelunasanAmount = currentPaymentStatus === 'dp' ? (order.sisa ?? 0) : order.harga_total;
    const paidAt = new Date();
    const data = await this.model
      .findByIdAndUpdate(
        id,
        {
          payment_proof: paymentProof,
          payment_status: 'paid',
          payment_settlement_method: 'transfer',
          sisa: 0,
          dibayar: currentPaymentStatus === 'dp' ? (order.sisa ?? 0) : order.harga_total,
          paid_date: paidAt,
          updated_date: paidAt,
          update_by: updatedBy ?? 'customer',
        },
        { new: true },
      )
      .lean();
    if (!data) throw new NotFoundException('Order not found');
    // Record pelunasan payment in tt_cash_daily
    if (pelunasanAmount > 0) {
      await this.cashDailyService.recordMovement(paidAt, 'in', pelunasanAmount);
    }
    return this.withNormalizedPaymentStatus(data);
  }

  async settleCashPayment(id: string, updatedBy?: string) {
    const order = await this.model.findById(id).lean();
    if (!order) throw new NotFoundException('Order not found');
    if (order.status === OrderStatus.CANCELLED) {
      throw new BadRequestException('Pesanan dibatalkan. Pembayaran tidak dapat diproses.');
    }
    const currentPaymentStatus = this.normalizePaymentStatus(order.payment_status);
    if (currentPaymentStatus === 'paid') {
      throw new BadRequestException('Order sudah lunas');
    }

    const pelunasanAmount = currentPaymentStatus === 'dp' ? (order.sisa ?? 0) : order.harga_total;
    const paidAt = new Date();
    const data = await this.model
      .findByIdAndUpdate(
        id,
        {
          payment_status: 'paid',
          payment_settlement_method: 'cash',
          sisa: 0,
          dibayar: currentPaymentStatus === 'dp' ? (order.sisa ?? 0) : order.harga_total,
          paid_date: paidAt,
          updated_date: paidAt,
          update_by: updatedBy ?? 'admin',
        },
        { new: true },
      )
      .lean();
    if (!data) throw new NotFoundException('Order not found');

    if (pelunasanAmount > 0) {
      await this.cashDailyService.recordMovement(paidAt, 'in', pelunasanAmount);
    }
    return this.withNormalizedPaymentStatus(data);
  }

  async getFollowUpMessage(id: string) {
    await this.autoCancelExpiredUnpaid();
    const [order, policy] = await Promise.all([
      this.model.findById(id).lean(),
      this.settingsService.getOrderPolicy(),
    ]);
    if (!order) throw new NotFoundException('Order not found');

    const statusLabel: Record<string, string> = {
      open: 'baru',
      processing: 'diproses',
      printing: 'printing',
      selesai: 'selesai',
      cancelled: 'dibatalkan',
    };
    const paymentLabel: Record<string, string> = {
      paid: 'sudah lunas',
      dp: 'baru DP',
      unpaid: 'belum bayar',
    };

    if (order.status === OrderStatus.CANCELLED) {
      const cancelQuery = order.kode_customer
        ? { kode_customer: order.kode_customer, status: OrderStatus.CANCELLED, payment_status: 'unpaid' }
        : { no_hp: order.no_hp, status: OrderStatus.CANCELLED, payment_status: 'unpaid' };
      const autoCancelCount = await this.model.countDocuments(cancelQuery);
      const remaining = Math.max(0, policy.suspend_after_auto_cancel_count - autoCancelCount);

      const warning =
        remaining > 0
          ? `Saat ini tercatat ${autoCancelCount} kali pembatalan otomatis. Jika terulang ${remaining} kali lagi, metode Bayar Nanti akan dibatasi selama ${policy.suspend_days} hari.`
          : `Saat ini tercatat ${autoCancelCount} kali pembatalan otomatis. Metode Bayar Nanti berisiko dibatasi selama ${policy.suspend_days} hari.`;

      return {
        order_id: String(order._id),
        message: `Halo ${order.nama_customer}, pesanan ${order.no_faktur} telah dibatalkan karena terlambat bayar dalam waktu yang ditentukan. ${warning}`,
      };
    }

    if (order.status === OrderStatus.SELESAI) {
      if (order.payment_status === 'paid') {
        return {
          order_id: String(order._id),
          message: `Halo ${order.nama_customer}, pesanan ${order.no_faktur} sudah selesai, silahkan ambil pesanan anda ke toko kami.`,
        };
      }

      const dibayar = order.payment_status === 'dp' ? (order.dp_amount ?? 0) : 0;
      const sisa = order.payment_status === 'dp' ? (order.sisa ?? Math.max(0, order.harga_total - dibayar)) : order.harga_total;
      return {
        order_id: String(order._id),
        message: `Halo ${order.nama_customer}, pesanan ${order.no_faktur} sudah selesai. Total pesanan ${this.formatIDR(order.harga_total)}. Anda ${order.payment_status === 'dp' ? `baru DP ${this.formatIDR(dibayar)}` : 'belum melakukan pembayaran'}. Silahkan selesaikan sisa pembayaran sebesar ${this.formatIDR(sisa)}, lalu silahkan ambil pesanan anda ke toko kami.`,
      };
    }

    if (order.payment_status === 'unpaid') {
      const deadline = new Date(new Date(order.created_at).getTime() + policy.unpaid_expiry_hours * 60 * 60 * 1000);
      const ms = deadline.getTime() - Date.now();
      const remainingHours = Math.max(0, Math.floor(ms / (1000 * 60 * 60)));
      const remainingMinutes = Math.max(0, Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60)));
      return {
        order_id: String(order._id),
        message: `Halo ${order.nama_customer}, pesanan ${order.no_faktur} saat ini status pengerjaan ${statusLabel[order.status] ?? order.status}. Silahkan perhatikan sisa waktu pembayaran anda (${remainingHours} jam ${remainingMinutes} menit). Jika belum dibayar dalam waktu tersebut, pesanan akan dibatalkan otomatis.`,
      };
    }

    return {
      order_id: String(order._id),
      message: `Halo ${order.nama_customer}, pesanan ${order.no_faktur} saat ini status pengerjaan ${statusLabel[order.status] ?? order.status} dan status pembayaran ${paymentLabel[order.payment_status] ?? order.payment_status}. Total pesanan ${this.formatIDR(order.harga_total)}.`,
    };
  }
}
