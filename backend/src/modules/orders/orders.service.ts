import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { OrderStatus } from '../../common/enums/order-status.enum';
import { MaterialsService } from '../materials/materials.service';
import { CashDailyService } from '../cash-daily/cash-daily.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { Order } from './schemas/order.schema';

@Injectable()
export class OrdersService {
  constructor(
    @InjectModel(Order.name) private readonly model: Model<Order>,
    private readonly materialsService: MaterialsService,
    private readonly cashDailyService: CashDailyService,
  ) { }

  /** Returns YYYYMMDD string in WIB (UTC+7) */
  private getWibDateString(): string {
    const now = new Date();
    const wib = new Date(now.getTime() + 7 * 60 * 60 * 1000);
    return wib.toISOString().slice(0, 10).replace(/-/g, '');
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

  async findAll(page = 1, limit = 20, search?: string, status?: string, date?: string) {
    const query: Record<string, any> = {};
    if (status && status !== 'all') query.status = status;
    if (date) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        throw new BadRequestException('Format tanggal tidak valid. Gunakan YYYY-MM-DD');
      }
      const startDate = new Date(`${date}T00:00:00+07:00`);
      const endDate = new Date(startDate.getTime() + 86_400_000);
      query.created_at = { $gte: startDate, $lt: endDate };
    }
    if (search) {
      const re = new RegExp(search, 'i');
      query.$or = [{ no_faktur: re }, { nama_customer: re }, { no_hp: re }];
    }
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.model.find(query).sort({ created_at: -1 }).skip(skip).limit(limit).lean(),
      this.model.countDocuments(query),
    ]);
    return { items, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async findById(id: string) {
    const data = await this.model.findById(id).lean();
    if (!data) throw new NotFoundException('Order not found');
    return data;
  }

  async findMyOrders(kodeCustomer: string, page = 1, limit = 20, status?: string, paymentStatus?: string) {
    const query: Record<string, any> = { kode_customer: kodeCustomer };
    if (status && status !== 'all') query.status = status;
    if (paymentStatus && paymentStatus !== 'all') query.payment_status = paymentStatus;

    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.model.find(query).sort({ created_at: -1 }).skip(skip).limit(limit).lean(),
      this.model.countDocuments(query),
    ]);

    return {
      items,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async create(dto: CreateOrderDto, designFile?: string, paymentProof?: string) {
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
        quantity: item.quantity,
        harga_satuan: hargaSatuan,
        subtotal,
      };
    });

    const harga_total = items.reduce((sum, item) => sum + item.subtotal, 0);
    const firstItem = items[0];
    const isDp = !!paymentProof && !!dto.dp_amount && dto.dp_amount > 0 && dto.dp_amount < harga_total;
    const isFullPaid = !!paymentProof && !isDp;
    const payment_status = isDp ? 'dp' : isFullPaid ? 'paid' : 'unpaid';
    const payment_settlement_method = paymentProof ? 'transfer' : undefined;
    const dp_amount = isDp ? dto.dp_amount! : isFullPaid ? harga_total : 0;
    const sisa = isDp ? harga_total - dto.dp_amount! : 0;
    const dibayar = isDp ? dp_amount : isFullPaid ? harga_total : 0;
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
      design_file: designFile,
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
    const data = await this.model
      .findByIdAndUpdate(
        id,
        { status: dto.status, updated_date: new Date(), update_by: updatedBy ?? 'system' },
        { new: true },
      )
      .lean();
    if (!data) throw new NotFoundException('Order not found');
    return data;
  }

  async uploadPaymentProof(id: string, paymentProof: string, updatedBy?: string) {
    const order = await this.model.findById(id).lean();
    if (!order) throw new NotFoundException('Order not found');
    if (order.payment_status === 'paid') {
      throw new BadRequestException('Order sudah lunas');
    }
    const pelunasanAmount = order.payment_status === 'dp' ? (order.sisa ?? 0) : order.harga_total;
    const paidAt = new Date();
    const data = await this.model
      .findByIdAndUpdate(
        id,
        {
          payment_proof: paymentProof,
          payment_status: 'paid',
          payment_settlement_method: 'transfer',
          sisa: 0,
          dibayar: order.payment_status === 'dp' ? (order.sisa ?? 0) : order.harga_total,
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
    return data;
  }

  async settleCashPayment(id: string, updatedBy?: string) {
    const order = await this.model.findById(id).lean();
    if (!order) throw new NotFoundException('Order not found');
    if (order.payment_status === 'paid') {
      throw new BadRequestException('Order sudah lunas');
    }

    const pelunasanAmount = order.payment_status === 'dp' ? (order.sisa ?? 0) : order.harga_total;
    const paidAt = new Date();
    const data = await this.model
      .findByIdAndUpdate(
        id,
        {
          payment_status: 'paid',
          payment_settlement_method: 'cash',
          sisa: 0,
          dibayar: order.payment_status === 'dp' ? (order.sisa ?? 0) : order.harga_total,
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
    return data;
  }
}
