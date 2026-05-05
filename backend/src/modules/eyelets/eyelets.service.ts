import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateEyeletDto } from './dto/create-eyelet.dto';
import { UpdateEyeletDto } from './dto/update-eyelet.dto';
import { Eyelet } from './schemas/eyelet.schema';

@Injectable()
export class EyeletsService {
  constructor(@InjectModel(Eyelet.name) private readonly model: Model<Eyelet>) {}

  private nowJakartaIsoString() {
    const base = new Date();
    const shifted = new Date(base.getTime() + 7 * 60 * 60 * 1000);
    return shifted.toISOString().replace('Z', '+07:00');
  }

  private toApi(doc: any) {
    return {
      _id: String(doc._id),
      name: doc.nama_mata_ayam,
      created_at: doc.created_date,
      status_delete: doc.status_delete,
      edited_by: doc.edited_by,
      edited_date: doc.edited_date,
      deleted_by: doc.deleted_by,
      deleted_date: doc.deleted_date,
    };
  }

  async create(dto: CreateEyeletDto, username: string) {
    const name = dto.name.trim().toUpperCase();
    const existing = await this.model.findOne({ nama_mata_ayam: name }).lean();

    if (existing && existing.status_delete) {
      return {
        needs_reactivate: true,
        eyelet_id: String(existing._id),
        message: 'Data ini sudah ada dalam status terhapus. Aktifkan kembali?',
      };
    }
    if (existing && !existing.status_delete) throw new ConflictException('Nama mata ayam sudah digunakan');

    const created = await this.model.create({
      nama_mata_ayam: name,
      status_delete: false,
      edited_by: username,
      edited_date: this.nowJakartaIsoString(),
      deleted_by: null,
      deleted_date: null,
      created_date: this.nowJakartaIsoString(),
    });
    return this.toApi(created);
  }

  async findAll(page = 1, limit = 10, search?: string) {
    const query: any = { status_delete: false };
    if (search?.trim()) {
      query.nama_mata_ayam = { $regex: search.trim(), $options: 'i' };
    }
    const [items, total] = await Promise.all([
      this.model.find(query).sort({ created_date: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      this.model.countDocuments(query),
    ]);
    return {
      items: items.map((x) => this.toApi(x)),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  async findById(id: string) {
    const d = await this.model.findById(id).lean();
    if (!d) throw new NotFoundException('Eyelet not found');
    return this.toApi(d);
  }

  async update(id: string, dto: UpdateEyeletDto, username: string) {
    const d = await this.model
      .findByIdAndUpdate(
        id,
        {
          ...(dto.name !== undefined ? { nama_mata_ayam: dto.name.trim().toUpperCase() } : {}),
          edited_by: username,
          edited_date: this.nowJakartaIsoString(),
        },
        { new: true },
      )
      .lean();
    if (!d) throw new NotFoundException('Eyelet not found');
    return this.toApi(d);
  }

  async remove(id: string, username: string) {
    const d = await this.model
      .findByIdAndUpdate(
        id,
        {
          status_delete: true,
          deleted_by: username,
          deleted_date: this.nowJakartaIsoString(),
          edited_by: username,
          edited_date: this.nowJakartaIsoString(),
        },
        { new: true },
      )
      .lean();
    if (!d) throw new NotFoundException('Eyelet not found');
    return { deleted: true };
  }

  async restore(id: string, username: string) {
    const restored = await this.model
      .findByIdAndUpdate(
        id,
        {
          status_delete: false,
          deleted_by: null,
          deleted_date: null,
          edited_by: username,
          edited_date: this.nowJakartaIsoString(),
        },
        { new: true },
      )
      .lean();
    if (!restored) throw new NotFoundException('Eyelet not found');
    return this.toApi(restored);
  }
}
