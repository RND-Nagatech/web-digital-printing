import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateCashDto } from './dto/create-cash.dto';
import { UpdateCashDto } from './dto/update-cash.dto';
import { Cash } from './schemas/cash.schema';
import { CashDailyService } from '../cash-daily/cash-daily.service';

@Injectable()
export class CashService {
  constructor(
    @InjectModel(Cash.name) private readonly model: Model<Cash>,
    private readonly cashDailyService: CashDailyService,
  ) { }

  private nowWibIso(): string {
    return new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString().replace('Z', '+07:00');
  }

  private todayWibRange(): { startUtc: Date; endUtc: Date } {
    const now = new Date(Date.now() + 7 * 60 * 60 * 1000);
    const yyyy = now.getUTCFullYear();
    const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(now.getUTCDate()).padStart(2, '0');
    const startWibIso = `${yyyy}-${mm}-${dd}T00:00:00+07:00`;
    const endWibIso = `${yyyy}-${mm}-${dd}T23:59:59.999+07:00`;
    return { startUtc: new Date(startWibIso), endUtc: new Date(endWibIso) };
  }

  async create(dto: CreateCashDto, createdBy?: string) {
    const entry = await this.model.create({
      type: dto.type.toUpperCase(),
      jumlah: dto.jumlah,
      deskripsi: dto.deskripsi.toUpperCase(),
      tanggal: new Date(),
      created_date: this.nowWibIso(),
      created_by: createdBy,
    });
    const direction = dto.type.toUpperCase() === 'PEMASUKAN' ? 'in' : 'out';

    try {
      await this.cashDailyService.recordMovement(entry.tanggal, direction, entry.jumlah);
    } catch (error) {
      // Jangan gagalkan penyimpanan tt_kas jika sinkronisasi harian bermasalah.
      console.error('[CashService.create] failed to sync tt_cash_daily via recordMovement:', error);
      try {
        await this.cashDailyService.recomputeDay(entry.tanggal);
      } catch (recomputeError) {
        console.error('[CashService.create] failed to fallback recomputeDay:', recomputeError);
      }
    }

    return entry;
  }

  async findAll(query?: { page?: number; limit?: number; search?: string; type?: 'PEMASUKAN' | 'PENGELUARAN' | 'ALL' }) {
    const page = Math.max(1, Number(query?.page ?? 1));
    const limit = Math.min(100, Math.max(1, Number(query?.limit ?? 10)));
    const { startUtc, endUtc } = this.todayWibRange();

    const filter: Record<string, unknown> = { tanggal: { $gte: startUtc, $lte: endUtc } };
    if (query?.type && query.type !== 'ALL') filter.type = query.type.toUpperCase();
    if (query?.search?.trim()) filter.deskripsi = { $regex: query.search.trim(), $options: 'i' };

    const [items, total] = await Promise.all([
      this.model.find(filter).sort({ tanggal: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      this.model.countDocuments(filter),
    ]);

    return {
      items,
      meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
    };
  }

  async update(id: string, dto: UpdateCashDto) {
    const patch: Record<string, unknown> = {};
    if (dto.type !== undefined) patch.type = dto.type.toUpperCase();
    if (dto.jumlah !== undefined) patch.jumlah = dto.jumlah;
    if (dto.deskripsi !== undefined) patch.deskripsi = dto.deskripsi;
    const d = await this.model.findByIdAndUpdate(id, patch, { new: true }).lean();
    if (!d) throw new NotFoundException('Cash not found');
    // Recompute the day's aggregate since type or jumlah may have changed
    await this.cashDailyService.recomputeDay(d.tanggal);
    return d;
  }
}
