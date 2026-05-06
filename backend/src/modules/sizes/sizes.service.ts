import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateSizeDto } from './dto/create-size.dto';
import { UpdateSizeDto } from './dto/update-size.dto';
import { Size } from './schemas/size.schema';

const DEFAULT_SIZES: Array<{ kode_ukuran: string; nama_ukuran: string; deskripsi: string; satuan: 'CM' | 'M'; panjang_cm: number; lebar_cm: number }> = [
  { kode_ukuran: 'A5', nama_ukuran: 'A5', deskripsi: 'UKURAN KERTAS A5', satuan: 'CM', panjang_cm: 21, lebar_cm: 14.8 },
  { kode_ukuran: 'A4', nama_ukuran: 'A4', deskripsi: 'UKURAN KERTAS A4', satuan: 'CM', panjang_cm: 29.7, lebar_cm: 21 },
  { kode_ukuran: 'A3', nama_ukuran: 'A3', deskripsi: 'UKURAN KERTAS A3', satuan: 'CM', panjang_cm: 42, lebar_cm: 29.7 },
  { kode_ukuran: 'A2', nama_ukuran: 'A2', deskripsi: 'UKURAN KERTAS A2', satuan: 'CM', panjang_cm: 59.4, lebar_cm: 42 },
  { kode_ukuran: 'A1', nama_ukuran: 'A1', deskripsi: 'UKURAN KERTAS A1', satuan: 'CM', panjang_cm: 84.1, lebar_cm: 59.4 },
  { kode_ukuran: 'A0', nama_ukuran: 'A0', deskripsi: 'UKURAN KERTAS A0', satuan: 'CM', panjang_cm: 118.9, lebar_cm: 84.1 },
];

@Injectable()
export class SizesService {
  constructor(@InjectModel(Size.name) private readonly model: Model<Size>) {}

  private nowJakartaIsoString() {
    const base = new Date();
    const shifted = new Date(base.getTime() + 7 * 60 * 60 * 1000);
    return shifted.toISOString().replace('Z', '+07:00');
  }

  private async ensureSeed() {
    const count = await this.model.countDocuments({});
    if (count > 0) return;
    await this.model.insertMany(
      DEFAULT_SIZES.map((s) => ({
        ...s,
        is_active: true,
        status_delete: false,
        created_at: this.nowJakartaIsoString(),
        edited_date: this.nowJakartaIsoString(),
        edited_by: 'system',
      })),
      { ordered: false },
    );
  }

  private toCm(value: number, unit: 'CM' | 'M') {
    return unit === 'M' ? Number((value * 100).toFixed(4)) : value;
  }

  async findAll(page = 1, limit = 10, search?: string) {
    await this.ensureSeed();
    const query: Record<string, any> = { status_delete: false };
    if (search?.trim()) {
      const re = new RegExp(search.trim(), 'i');
      query.$or = [{ kode_ukuran: re }, { nama_ukuran: re }, { deskripsi: re }];
    }

    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.model.find(query).sort({ kode_ukuran: 1 }).skip(skip).limit(limit).lean(),
      this.model.countDocuments(query),
    ]);
    return { items, meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) } };
  }

  async findPublic() {
    await this.ensureSeed();
    const items = await this.model.find({ status_delete: false, is_active: true }).sort({ kode_ukuran: 1 }).lean();
    return items;
  }

  async create(dto: CreateSizeDto, username: string) {
    const kode = dto.kode_ukuran.trim().toUpperCase();
    const satuan = dto.satuan?.toUpperCase() === 'M' ? 'M' : 'CM';
    const panjangCm = this.toCm(dto.panjang_cm, satuan);
    const lebarCm = this.toCm(dto.lebar_cm, satuan);
    const exists = await this.model.findOne({ kode_ukuran: kode }).lean();
    if (exists && !exists.status_delete) throw new ConflictException('Kode ukuran sudah digunakan');
    if (exists?.status_delete) {
      const restored = await this.model.findByIdAndUpdate(
        exists._id,
        {
          kode_ukuran: kode,
          nama_ukuran: dto.nama_ukuran.trim(),
          deskripsi: dto.deskripsi?.trim().toUpperCase() || '',
          satuan,
          panjang_cm: panjangCm,
          lebar_cm: lebarCm,
          is_active: dto.is_active ?? true,
          status_delete: false,
          edited_by: username,
          edited_date: this.nowJakartaIsoString(),
        },
        { new: true },
      ).lean();
      return restored;
    }

    return this.model.create({
      kode_ukuran: kode,
      nama_ukuran: dto.nama_ukuran.trim(),
      deskripsi: dto.deskripsi?.trim().toUpperCase() || '',
      satuan,
      panjang_cm: panjangCm,
      lebar_cm: lebarCm,
      is_active: dto.is_active ?? true,
      status_delete: false,
      created_at: this.nowJakartaIsoString(),
      edited_date: this.nowJakartaIsoString(),
      edited_by: username,
    });
  }

  async update(id: string, dto: UpdateSizeDto, username: string) {
    const patch: Record<string, unknown> = {
      ...(dto.kode_ukuran !== undefined ? { kode_ukuran: dto.kode_ukuran.trim().toUpperCase() } : {}),
      ...(dto.nama_ukuran !== undefined ? { nama_ukuran: dto.nama_ukuran.trim() } : {}),
      ...(dto.deskripsi !== undefined ? { deskripsi: dto.deskripsi.trim().toUpperCase() } : {}),
      ...(dto.satuan !== undefined ? { satuan: dto.satuan.toUpperCase() === 'M' ? 'M' : 'CM' } : {}),
      ...(dto.is_active !== undefined ? { is_active: dto.is_active } : {}),
      edited_by: username,
      edited_date: this.nowJakartaIsoString(),
    };
    if (dto.panjang_cm !== undefined) {
      const unit = ((dto.satuan ?? 'CM').toUpperCase() === 'M' ? 'M' : 'CM') as 'CM' | 'M';
      patch.panjang_cm = this.toCm(dto.panjang_cm, unit);
    }
    if (dto.lebar_cm !== undefined) {
      const unit = ((dto.satuan ?? 'CM').toUpperCase() === 'M' ? 'M' : 'CM') as 'CM' | 'M';
      patch.lebar_cm = this.toCm(dto.lebar_cm, unit);
    }

    const updated = await this.model.findOneAndUpdate({ _id: id, status_delete: false }, patch, { new: true }).lean();
    if (!updated) throw new NotFoundException('Ukuran tidak ditemukan');
    return updated;
  }

  async remove(id: string, username: string) {
    const updated = await this.model.findOneAndUpdate(
      { _id: id, status_delete: false },
      { status_delete: true, is_active: false, edited_by: username, edited_date: this.nowJakartaIsoString() },
      { new: true },
    ).lean();
    if (!updated) throw new NotFoundException('Ukuran tidak ditemukan');
    return { deleted: true };
  }
}
