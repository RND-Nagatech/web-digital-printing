import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, PipelineStage } from 'mongoose';
import { Cash } from '../cash/schemas/cash.schema';
import { Order } from '../orders/schemas/order.schema';
import { CashDailyService } from '../cash-daily/cash-daily.service';

type FinanceDetailItem = {
  tanggal: string;
  tanggal_ts: Date;
  kategori: string;
  deskripsi: string;
  uang_masuk: number;
  uang_keluar: number;
};

type SalesTransactionItem = {
  tanggal: string;
  no_faktur: string;
  pelanggan: string;
  pesanan: string;
  quantity: number;
  harga_jual_per_meter: number;
  harga_total: number;
  tunai: number;
  transfer: number;
  dp: number;
  sisa: number;
};

@Injectable()
export class ReportsService {
  constructor(
    @InjectModel(Order.name) private readonly orderModel: Model<Order>,
    @InjectModel(Cash.name) private readonly cashModel: Model<Cash>,
    private readonly cashDailyService: CashDailyService,
  ) { }

  private toWibDateString(date: Date): string {
    const wib = new Date(date.getTime() + 7 * 60 * 60 * 1000);
    return wib.toISOString().slice(0, 10);
  }

  private escapeRegex(value: string) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private parseDateRange(from?: string, to?: string): {
    from: string;
    to: string;
    fromUtc: Date;
    toUtc: Date;
  } {
    if (!from || !to) {
      throw new BadRequestException('Tanggal awal dan tanggal akhir wajib diisi');
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
      throw new BadRequestException('Format tanggal tidak valid. Gunakan YYYY-MM-DD');
    }
    if (from > to) {
      throw new BadRequestException('Tanggal awal tidak boleh lebih besar dari tanggal akhir');
    }
    const fromUtc = new Date(`${from}T00:00:00+07:00`);
    const toUtc = new Date(`${to}T23:59:59.999+07:00`);
    return { from, to, fromUtc, toUtc };
  }

  async summary() {
    const [totalOrders, paidOrders, totalRevenueAgg] = await Promise.all([
      this.orderModel.countDocuments(),
      this.orderModel.countDocuments({ payment_status: 'paid' }),
      this.orderModel.aggregate([{ $match: { payment_status: { $in: ['paid', 'dp'] } } }, { $group: { _id: null, total: { $sum: '$dibayar' } } }]),
    ]);

    return {
      total_orders: totalOrders,
      paid_orders: paidOrders,
      total_revenue: totalRevenueAgg[0]?.total ?? 0,
    };
  }

  async finance() {
    const [incomeAgg, expenseAgg] = await Promise.all([
      this.cashModel.aggregate([{ $match: { type: 'PEMASUKAN' } }, { $group: { _id: null, total: { $sum: '$jumlah' } } }]),
      this.cashModel.aggregate([{ $match: { type: 'PENGELUARAN' } }, { $group: { _id: null, total: { $sum: '$jumlah' } } }]),
    ]);

    return {
      total_income: incomeAgg[0]?.total ?? 0,
      total_expense: expenseAgg[0]?.total ?? 0,
      net: (incomeAgg[0]?.total ?? 0) - (expenseAgg[0]?.total ?? 0),
    };
  }

  async getFinanceReport(
    type: 'rekap' | 'detail',
    from?: string,
    to?: string,
    search?: string,
  ) {
    const saldoAwal = from ? await this.cashDailyService.getSaldoBeforeDate(from) : 0;
    const fromUtc = from ? new Date(`${from}T00:00:00+07:00`) : undefined;
    const toUtc = to ? new Date(`${to}T23:59:59.999+07:00`) : undefined;
    const dateFilter: Record<string, Date> = {};
    if (fromUtc) dateFilter.$gte = fromUtc;
    if (toUtc) dateFilter.$lte = toUtc;
    const hasDateFilter = Object.keys(dateFilter).length > 0;

    if (type === 'rekap') {
      const [incomeAgg, expenseAgg, ordersCreatedNoPaidDate, ordersWithPaidDate] = await Promise.all([
        this.cashModel.aggregate([
          { $match: { ...(hasDateFilter ? { tanggal: dateFilter } : {}), type: 'PEMASUKAN' } },
          { $group: { _id: null, total: { $sum: '$jumlah' } } },
        ]),
        this.cashModel.aggregate([
          { $match: { ...(hasDateFilter ? { tanggal: dateFilter } : {}), type: 'PENGELUARAN' } },
          { $group: { _id: null, total: { $sum: '$jumlah' } } },
        ]),
        this.orderModel.aggregate([
          {
            $match: {
              ...(hasDateFilter ? { created_at: dateFilter } : {}),
              status: { $ne: 'cancelled' },
              payment_status: { $in: ['dp', 'paid'] },
              $or: [{ paid_date: { $exists: false } }, { paid_date: null }],
            },
          },
          { $group: { _id: null, total: { $sum: '$dibayar' } } },
        ]),
        this.orderModel.aggregate([
          {
            $match: {
              paid_date: hasDateFilter ? dateFilter : { $exists: true, $ne: null },
              status: { $ne: 'cancelled' },
            },
          },
          { $group: { _id: null, total: { $sum: '$dibayar' } } },
        ]),
      ]);

      const kasMasuk = incomeAgg[0]?.total ?? 0;
      const kasKeluar = expenseAgg[0]?.total ?? 0;
      const penjualan = (ordersCreatedNoPaidDate[0]?.total ?? 0) + (ordersWithPaidDate[0]?.total ?? 0);

      let items = [
        { kategori: 'KAS MASUK', kas_penjualan: 'KAS' as const, uang_masuk: kasMasuk, uang_keluar: 0 },
        { kategori: 'KAS KELUAR', kas_penjualan: 'KAS' as const, uang_masuk: 0, uang_keluar: kasKeluar },
        { kategori: 'PENJUALAN', kas_penjualan: 'PENJUALAN' as const, uang_masuk: penjualan, uang_keluar: 0 },
      ];

      if (search?.trim()) {
        const q = search.trim().toLowerCase();
        items = items.filter((i) => i.kategori.toLowerCase().includes(q) || i.kas_penjualan.toLowerCase().includes(q));
      }

      const totalMasuk = items.reduce((s, r) => s + r.uang_masuk, 0);
      const totalKeluar = items.reduce((s, r) => s + r.uang_keluar, 0);
      const saldoAkhir = saldoAwal + totalMasuk - totalKeluar;

      return {
        type: 'rekap',
        items,
        summary: {
          saldo_awal: saldoAwal,
          total_uang_masuk: totalMasuk,
          total_uang_keluar: totalKeluar,
          saldo_akhir: saldoAkhir,
        },
      };
    }

    // Detail view — query from source collections
    const [kasEntries, ordersCreated, ordersPaid] = await Promise.all([
      this.cashModel
        .find(hasDateFilter ? { tanggal: dateFilter } : {})
        .sort({ tanggal: 1 })
        .lean(),
      // Orders with initial payment (dp or full) made at creation
      this.orderModel
        .find({
          ...(hasDateFilter ? { created_at: dateFilter } : {}),
          dp_amount: { $gt: 0 },
          status: { $ne: 'cancelled' },
        })
        .sort({ created_at: 1 })
        .lean(),
      // Orders with pelunasan (uploadPaymentProof)
      this.orderModel
        .find({
          paid_date: hasDateFilter ? dateFilter : { $exists: true, $ne: null },
          status: { $ne: 'cancelled' },
        })
        .sort({ paid_date: 1 })
        .lean(),
    ]);

    let items: FinanceDetailItem[] = [
      ...kasEntries.map((c) => ({
        tanggal: this.toWibDateString(c.tanggal),
        tanggal_ts: c.tanggal,
        kategori: c.type === 'PEMASUKAN' ? 'Kas Masuk' : 'Kas Keluar',
        deskripsi: c.deskripsi,
        uang_masuk: c.type === 'PEMASUKAN' ? c.jumlah : 0,
        uang_keluar: c.type === 'PENGELUARAN' ? c.jumlah : 0,
      })),
      ...ordersCreated.map((o) => ({
        tanggal: this.toWibDateString(o.created_at),
        tanggal_ts: o.created_at,
        kategori: !o.paid_date && o.payment_status === 'paid' ? 'Order (Lunas)' : 'Order (DP)',
        deskripsi: o.no_faktur,
        uang_masuk: o.dp_amount,
        uang_keluar: 0,
      })),
      ...ordersPaid.map((o) => ({
        tanggal: this.toWibDateString(o.paid_date!),
        tanggal_ts: o.paid_date!,
        kategori: 'Order (Pelunasan)',
        deskripsi: o.no_faktur,
        uang_masuk: o.dibayar,
        uang_keluar: 0,
      })),
    ].sort((a, b) => a.tanggal_ts.getTime() - b.tanggal_ts.getTime());

    if (search?.trim()) {
      const q = search.trim().toLowerCase();
      items = items.filter(
        (i) => i.deskripsi.toLowerCase().includes(q) || i.kategori.toLowerCase().includes(q),
      );
    }

    const totalMasuk = items.reduce((s, i) => s + i.uang_masuk, 0);
    const totalKeluar = items.reduce((s, i) => s + i.uang_keluar, 0);

    return {
      type: 'detail',
      items: items.map(({ tanggal_ts: _ts, ...rest }) => rest),
      summary: {
        saldo_awal: saldoAwal,
        total_uang_masuk: totalMasuk,
        total_uang_keluar: totalKeluar,
        saldo_akhir: saldoAwal + totalMasuk - totalKeluar,
      },
    };
  }

  async getTopMaterials(params?: {
    from?: string;
    to?: string;
    search?: string;
    limit?: number;
  }) {
    const fromUtc = params?.from ? new Date(`${params.from}T00:00:00+07:00`) : undefined;
    const toUtc = params?.to ? new Date(`${params.to}T23:59:59.999+07:00`) : undefined;
    const dateFilter: Record<string, Date> = {};
    if (fromUtc) dateFilter.$gte = fromUtc;
    if (toUtc) dateFilter.$lte = toUtc;
    const hasDateFilter = Object.keys(dateFilter).length > 0;

    const safeLimit = Math.min(Math.max(params?.limit ?? 20, 1), 100);

    const basePipeline: PipelineStage[] = [
      {
        $match: {
          status: { $ne: 'cancelled' },
          ...(hasDateFilter ? { created_at: dateFilter } : {}),
        },
      },
      { $unwind: '$items' },
      {
        $group: {
          _id: {
            kode_bahan: '$items.kode_bahan',
            nama_bahan: '$items.nama_bahan',
          },
          total_qty: { $sum: '$items.quantity' },
          total_order_lines: { $sum: 1 },
          total_area: { $sum: '$items.area' },
          total_revenue: {
            $sum: {
              $cond: [
                { $gt: ['$harga_total', 0] },
                {
                  $multiply: [
                    '$items.subtotal',
                    {
                      $divide: [
                        {
                          $add: [
                            { $ifNull: ['$dp_amount', 0] },
                            {
                              $cond: [
                                { $ifNull: ['$paid_date', false] },
                                { $ifNull: ['$dibayar', 0] },
                                0,
                              ],
                            },
                          ],
                        },
                        '$harga_total',
                      ],
                    },
                  ],
                },
                0,
              ],
            },
          },
          orders: { $addToSet: '$no_faktur' },
        },
      },
      {
        $project: {
          _id: 0,
          kode_bahan: '$_id.kode_bahan',
          nama_bahan: '$_id.nama_bahan',
          total_qty: 1,
          total_order_lines: 1,
          total_area: 1,
          total_revenue: 1,
          total_orders: { $size: '$orders' },
        },
      },
    ];

    const search = params?.search?.trim();
    const pipeline: PipelineStage[] = [...basePipeline];

    if (search) {
      const searchRe = new RegExp(this.escapeRegex(search), 'i');
      pipeline.push({
        $match: {
          $or: [
            { kode_bahan: searchRe },
            { nama_bahan: searchRe },
          ],
        },
      });
    }

    pipeline.push({ $sort: { total_qty: -1, total_orders: -1, total_revenue: -1 } });
    pipeline.push({ $limit: safeLimit });

    const items = await this.orderModel.aggregate(pipeline);

    const summary = {
      total_materials: items.length,
      total_qty: items.reduce((sum: number, item: any) => sum + (item.total_qty ?? 0), 0),
      total_revenue: items.reduce((sum: number, item: any) => sum + (item.total_revenue ?? 0), 0),
    };

    return {
      items,
      summary,
      meta: {
        limit: safeLimit,
        from: params?.from ?? null,
        to: params?.to ?? null,
      },
    };
  }

  async getSalesTransactionsReport(params?: { from?: string; to?: string; search?: string }) {
    const { from, to, fromUtc, toUtc } = this.parseDateRange(params?.from, params?.to);
    const search = params?.search?.trim();
    const searchFilter = search
      ? {
        $or: (() => {
          const escaped = this.escapeRegex(search);
          const searchRe = new RegExp(escaped, 'i');
          const isOrderCode = /^ORD-\d{8}-\d{4}$/i.test(search);
          if (isOrderCode) {
            return [{ no_faktur: new RegExp(`^${escaped}$`, 'i') }];
          }
          return [
            { no_faktur: searchRe },
            { nama_customer: searchRe },
            { no_hp: searchRe },
          ];
        })(),
      }
      : {};

    const orders = await this.orderModel
      .find({
        created_at: { $gte: fromUtc, $lte: toUtc },
        status: { $ne: 'cancelled' },
        ...searchFilter,
      })
      .sort({ created_at: 1, no_faktur: 1 })
      .lean();

    const items: SalesTransactionItem[] = [];
    for (const order of orders) {
      const lines = order.items?.length
        ? order.items
        : [{
          kode_bahan: order.kode_bahan,
          nama_bahan: order.kode_bahan,
          panjang: order.panjang,
          lebar: order.lebar,
          quantity: order.quantity,
          area: order.area,
          subtotal: order.harga_total,
          harga_satuan: order.quantity > 0 ? Math.round(order.harga_total / order.quantity) : order.harga_total,
        }];

      for (const line of lines) {
        const ratioBase = order.harga_total > 0 ? (line.subtotal / order.harga_total) : 0;
        const ratio = Number.isFinite(ratioBase) ? Math.max(0, Math.min(1, ratioBase)) : 0;
        const tunaiRaw = order.payment_settlement_method === 'cash' ? (order.dibayar ?? 0) : 0;
        const transferRaw = order.payment_settlement_method === 'transfer' ? (order.dibayar ?? 0) : 0;
        const dpRaw = order.dp_amount ?? 0;
        const sisaRaw = order.sisa ?? 0;

        const areaTotal = (line.area ?? 0) * (line.quantity ?? 0);
        const hargaJualPerMeter = areaTotal > 0 ? Math.round(line.subtotal / areaTotal) : 0;

        items.push({
          tanggal: this.toWibDateString(order.created_at),
          no_faktur: order.no_faktur,
          pelanggan: order.nama_customer,
          pesanan: `${line.nama_bahan} (${line.panjang} x ${line.lebar} m)`,
          quantity: line.quantity,
          harga_jual_per_meter: hargaJualPerMeter,
          harga_total: line.subtotal,
          tunai: Math.round(tunaiRaw * ratio),
          transfer: Math.round(transferRaw * ratio),
          dp: Math.round(dpRaw * ratio),
          sisa: Math.round(sisaRaw * ratio),
        });
      }
    }

    const summary = {
      total_records: items.length,
      total_quantity: items.reduce((sum, row) => sum + (row.quantity || 0), 0),
      total_harga_total: items.reduce((sum, row) => sum + (row.harga_total || 0), 0),
      total_tunai: items.reduce((sum, row) => sum + (row.tunai || 0), 0),
      total_transfer: items.reduce((sum, row) => sum + (row.transfer || 0), 0),
      total_dp: items.reduce((sum, row) => sum + (row.dp || 0), 0),
      total_sisa: items.reduce((sum, row) => sum + (row.sisa || 0), 0),
    };

    return {
      items,
      summary,
      meta: {
        from,
        to,
      },
    };
  }
}
