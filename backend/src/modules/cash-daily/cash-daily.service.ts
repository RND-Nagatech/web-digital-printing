import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CashDaily } from './schemas/cash-daily.schema';
import { CashDailyHistory } from './schemas/cash-daily-history.schema';
import { Cash } from '../cash/schemas/cash.schema';
import { Order } from '../orders/schemas/order.schema';

export type DailyCashRow = {
    tanggal: string;
    saldo_akhir: number;
    saldo_awal: number;
    uang_keluar: number;
    uang_masuk: number;
    __v?: number;
};

@Injectable()
export class CashDailyService {
    private readonly logger = new Logger(CashDailyService.name);
    constructor(
        @InjectModel(CashDaily.name) private readonly cashDailyModel: Model<CashDaily>,
        @InjectModel(CashDailyHistory.name) private readonly historyModel: Model<CashDailyHistory>,
        @InjectModel(Cash.name) private readonly cashModel: Model<Cash>,
        @InjectModel(Order.name) private readonly orderModel: Model<Order>,
    ) { }

    async onModuleInit() {
        try {
            await this.ensureToday();
        } catch (error) {
            this.logger.warn(`Failed to ensure cash daily on startup: ${(error as Error)?.message ?? 'unknown error'}`);
        }
    }

    toWibDateString(date: Date): string {
        const wib = new Date(date.getTime() + 7 * 60 * 60 * 1000);
        return wib.toISOString().slice(0, 10);
    }

    private todayWib(): string {
        return this.toWibDateString(new Date());
    }

    private dayRange(tanggal: string): { startUtc: Date; endUtc: Date } {
        return {
            startUtc: new Date(`${tanggal}T00:00:00+07:00`),
            endUtc: new Date(`${tanggal}T23:59:59.999+07:00`),
        };
    }

    /**
     * Pastikan tt_cash_daily berisi record hari ini (WIB).
     * Jika record lama (hari sebelumnya) ditemukan, arsipkan ke th_cash_daily
     * lalu buat record baru dengan saldo_awal = saldo_akhir kemarin.
     */
    async ensureToday(): Promise<void> {
        const today = this.todayWib();

        // Ambil record yang ada di tt_cash_daily
        const current = await this.cashDailyModel.findOne().sort({ tanggal: -1 }).lean();

        if (!current) {
            // Belum ada sama sekali — cari saldo_akhir terakhir dari history
            const lastHistory = await this.historyModel.findOne().sort({ tanggal: -1 }).lean();
            const saldoAwal = lastHistory?.saldo_akhir ?? 0;
            await this.cashDailyModel.updateOne(
                { tanggal: today },
                { $setOnInsert: { tanggal: today, saldo_awal: saldoAwal, uang_masuk: 0, uang_keluar: 0, saldo_akhir: saldoAwal } },
                { upsert: true },
            );
            return;
        }

        if (current.tanggal === today) return; // sudah up-to-date

        // Record adalah hari sebelumnya → arsipkan ke th_cash_daily
        if (current.tanggal < today) {
            await this.historyModel.updateOne(
                { tanggal: current.tanggal },
                {
                    $set: {
                        saldo_awal: current.saldo_awal ?? 0,
                        uang_masuk: current.uang_masuk ?? 0,
                        uang_keluar: current.uang_keluar ?? 0,
                        saldo_akhir: current.saldo_akhir ?? 0,
                        closed_at: new Date().toISOString(),
                    },
                },
                { upsert: true },
            );
            await this.cashDailyModel.deleteOne({ _id: current._id });

            // Buat record baru untuk hari ini, saldo_awal = saldo_akhir kemarin
            const prevSaldo = current.saldo_akhir ?? 0;
            await this.cashDailyModel.updateOne(
                { tanggal: today },
                {
                    $setOnInsert: {
                        tanggal: today,
                        saldo_awal: prevSaldo,
                        uang_masuk: 0,
                        uang_keluar: 0,
                        saldo_akhir: prevSaldo,
                    },
                },
                { upsert: true },
            );
        }
    }

    /**
     * Catat pergerakan kas hari ini dan update saldo_akhir.
     */
    async recordMovement(tanggal: Date | string, direction: 'in' | 'out', amount: number): Promise<void> {
        if (amount <= 0) return;
        await this.ensureToday();

        const today = this.todayWib();
        const doc = await this.cashDailyModel.findOne({ tanggal: today }).lean();
        if (!doc) return;

        const uangMasuk = (doc.uang_masuk ?? 0) + (direction === 'in' ? amount : 0);
        const uangKeluar = (doc.uang_keluar ?? 0) + (direction === 'out' ? amount : 0);
        const saldoAkhir = (doc.saldo_awal ?? 0) + uangMasuk - uangKeluar;

        await this.cashDailyModel.updateOne(
            { tanggal: today },
            { $set: { uang_masuk: uangMasuk, uang_keluar: uangKeluar, saldo_akhir: saldoAkhir } },
        );
    }

    /**
     * Recompute penuh satu hari dari source collections, lalu sync saldo_akhir.
     */
    async recomputeDay(tanggal: Date | string): Promise<void> {
        await this.ensureToday();
        const tanggalStr = typeof tanggal === 'string' ? tanggal : this.toWibDateString(tanggal);
        const { startUtc, endUtc } = this.dayRange(tanggalStr);

        const [kasResult, orderCreatedResult, orderPaidResult] = await Promise.all([
            this.cashModel.aggregate([
                { $match: { tanggal: { $gte: startUtc, $lte: endUtc } } },
                { $group: { _id: '$type', total: { $sum: '$jumlah' } } },
            ]),
            this.orderModel.aggregate([
                { $match: { created_at: { $gte: startUtc, $lte: endUtc }, dp_amount: { $gt: 0 }, status: { $ne: 'cancelled' } } },
                { $group: { _id: null, total: { $sum: '$dp_amount' } } },
            ]),
            this.orderModel.aggregate([
                { $match: { paid_date: { $gte: startUtc, $lte: endUtc }, status: { $ne: 'cancelled' } } },
                { $group: { _id: null, total: { $sum: '$dibayar' } } },
            ]),
        ]);

        let kasIn = 0;
        let kasOut = 0;
        for (const r of kasResult) {
            if (r._id === 'PEMASUKAN') kasIn += r.total ?? 0;
            else if (r._id === 'PENGELUARAN') kasOut += r.total ?? 0;
        }
        const orderIn = (orderCreatedResult[0]?.total ?? 0) + (orderPaidResult[0]?.total ?? 0);
        const uangMasuk = kasIn + orderIn;

        // Ambil saldo_awal yang sudah tersimpan; jika belum ada, ambil dari saldo akhir hari sebelumnya.
        const existing = await this.cashDailyModel.findOne({ tanggal: tanggalStr }).lean();
        const saldoAwal = existing?.saldo_awal ?? (await this.getSaldoBeforeDate(tanggalStr));

        await this.cashDailyModel.updateOne(
            { tanggal: tanggalStr },
            {
                $setOnInsert: { tanggal: tanggalStr, saldo_awal: saldoAwal },
                $set: { uang_masuk: uangMasuk, uang_keluar: kasOut, saldo_akhir: saldoAwal + uangMasuk - kasOut },
            },
            { upsert: true },
        );
    }

    /**
     * Ambil data rekap per hari dalam rentang tanggal.
     * Gabungkan dari th_cash_daily (history) + tt_cash_daily (hari ini jika dalam range).
     */
    async getByRange(from?: string, to?: string): Promise<DailyCashRow[]> {
        await this.ensureToday();
        const today = this.todayWib();
        const rangeFilter: Record<string, string> = {};
        if (from) rangeFilter.$gte = from;
        if (to) rangeFilter.$lte = to;
        const where = Object.keys(rangeFilter).length ? { tanggal: rangeFilter } : {};

        const [historyRows, currentRows] = await Promise.all([
            this.historyModel.find(where).sort({ tanggal: 1 }).lean(),
            this.cashDailyModel.find(where).sort({ tanggal: 1 }).lean(),
        ]);

        // Merge: history rows diutamakan, hari ini dari tt_cash_daily
        const merged = new Map<string, DailyCashRow>();
        for (const r of historyRows) {
            merged.set(r.tanggal, { tanggal: r.tanggal, saldo_awal: r.saldo_awal, uang_masuk: r.uang_masuk, uang_keluar: r.uang_keluar, saldo_akhir: r.saldo_akhir });
        }
        for (const r of currentRows) {
            if (r.tanggal === today || !merged.has(r.tanggal)) {
                merged.set(r.tanggal, { tanggal: r.tanggal, saldo_awal: r.saldo_awal, uang_masuk: r.uang_masuk, uang_keluar: r.uang_keluar, saldo_akhir: r.saldo_akhir });
            }
        }

        return [...merged.values()].sort((a, b) => a.tanggal.localeCompare(b.tanggal));
    }

    /**
     * Saldo akhir dari hari terakhir sebelum tanggal yang diminta (dari th_cash_daily).
     */
    async getSaldoBeforeDate(date: string): Promise<number> {
        await this.ensureToday();
        const row = await this.historyModel.findOne({ tanggal: { $lt: date } }).sort({ tanggal: -1 }).lean();
        if (row) return row.saldo_akhir;

        // Fallback: cek di tt_cash_daily jika belum pernah ada rollover
        const currentRow = await this.cashDailyModel.findOne({ tanggal: { $lt: date } }).sort({ tanggal: -1 }).lean();
        return currentRow?.saldo_akhir ?? 0;
    }
}
