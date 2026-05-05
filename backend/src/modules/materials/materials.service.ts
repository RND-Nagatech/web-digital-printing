import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateMaterialDto } from './dto/create-material.dto';
import { UpdateMaterialDto } from './dto/update-material.dto';
import { Material } from './schemas/material.schema';
import { Banner } from '../banners/schemas/banner.schema';

@Injectable()
export class MaterialsService {
  constructor(
    @InjectModel(Material.name) private readonly model: Model<Material>,
    @InjectModel(Banner.name) private readonly bannerModel: Model<Banner>,
  ) { }

  private nowJakartaIsoString() {
    const base = new Date();
    const shifted = new Date(base.getTime() + 7 * 60 * 60 * 1000);
    return shifted.toISOString().replace('Z', '+07:00');
  }

  private toJakartaIso(value?: Date | string | null) {
    if (!value) return null;
    if (typeof value === 'string' && value.endsWith('+07:00')) return value;
    const base = new Date(value);
    if (Number.isNaN(base.getTime())) return null;
    const shifted = new Date(base.getTime() + 7 * 60 * 60 * 1000);
    return shifted.toISOString().replace('Z', '+07:00');
  }

  private toApi(doc: any, imageUrl?: string | null) {
    return {
      _id: String(doc._id),
      code: doc.kode_bahan,
      name: doc.nama_bahan,
      description: doc.deskripsi,
      price_per_meter: doc.harga_per_meter,
      is_active: doc.is_active,
      image_url: imageUrl ?? null,
      created_at: this.toJakartaIso(doc.created_at),
      status_delete: doc.status_delete,
      edited_by: doc.edited_by,
      edited_date: this.toJakartaIso(doc.edited_date),
      deleted_by: doc.deleted_by,
      deleted_date: this.toJakartaIso(doc.deleted_date),
    };
  }

  async create(dto: CreateMaterialDto, username: string) {
    const kodeBahan = dto.code.trim().toUpperCase();
    const namaBahan = dto.name.trim().toUpperCase();
    const deskripsi = dto.description?.trim().toUpperCase() || '';

    const existingByName = await this.model.findOne({ nama_bahan: namaBahan }).lean();
    if (existingByName && existingByName.status_delete) {
      return {
        needs_reactivate: true,
        material_id: String(existingByName._id),
        message: 'Data ini sudah ada dalam status terhapus. Aktifkan kembali?',
      };
    }

    if (existingByName && !existingByName.status_delete) throw new ConflictException('Nama bahan sudah digunakan');

    const created = await this.model.create({
      kode_bahan: kodeBahan,
      nama_bahan: namaBahan,
      deskripsi,
      harga_per_meter: dto.price_per_meter,
      is_active: dto.is_active ?? true,
      status_delete: false,
      edited_by: username,
      edited_date: this.nowJakartaIsoString(),
      deleted_by: null,
      deleted_date: null,
      created_at: this.nowJakartaIsoString(),
    });

    return this.toApi(created);
  }

  async findAll(page = 1, limit = 10, search?: string) {
    const query: any = { status_delete: false };
    if (search?.trim()) {
      const regex = new RegExp(search.trim(), 'i');
      query.$or = [{ kode_bahan: regex }, { nama_bahan: regex }, { deskripsi: regex }];
    }

    const [items, total] = await Promise.all([
      this.model
        .find(query)
        .sort({ created_at: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      this.model.countDocuments(query),
    ]);

    const codes = items.map((x) => x.kode_bahan);
    const banners = await this.bannerModel
      .find({ kode_bahan: { $in: codes }, deleted_by: null })
      .lean();
    const bannerMap = new Map(banners.map((b) => [b.kode_bahan, b.image_url]));

    return {
      items: items.map((x) => this.toApi(x, bannerMap.get(x.kode_bahan))),
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
    if (!d) throw new NotFoundException('Material not found');
    return this.toApi(d);
  }

  async findByCode(code: string) {
    const d = await this.model.findOne({ kode_bahan: code.trim().toUpperCase(), status_delete: false }).lean();
    if (!d) throw new NotFoundException(`Material dengan kode "${code}" tidak ditemukan`);
    return this.toApi(d);
  }

  async update(id: string, dto: UpdateMaterialDto, username: string) {
    const d = await this.model
      .findByIdAndUpdate(
        id,
        {
          ...(dto.name !== undefined ? { nama_bahan: dto.name.trim().toUpperCase() } : {}),
          ...(dto.description !== undefined ? { deskripsi: dto.description.trim().toUpperCase() } : {}),
          ...(dto.price_per_meter !== undefined ? { harga_per_meter: dto.price_per_meter } : {}),
          ...(dto.is_active !== undefined ? { is_active: dto.is_active } : {}),
          edited_by: username,
          edited_date: this.nowJakartaIsoString(),
        },
        { new: true },
      )
      .lean();
    if (!d) throw new NotFoundException('Material not found');
    return this.toApi(d);
  }

  async remove(id: string, username: string) {
    const d = await this.model
      .findByIdAndUpdate(
        id,
        {
          status_delete: true,
          is_active: false,
          deleted_by: username,
          deleted_date: this.nowJakartaIsoString(),
          edited_by: username,
          edited_date: this.nowJakartaIsoString(),
        },
        { new: true },
      )
      .lean();
    if (!d) throw new NotFoundException('Material not found');
    return { deleted: true };
  }

  async restore(id: string, username: string) {
    const restored = await this.model
      .findByIdAndUpdate(
        id,
        {
          status_delete: false,
          is_active: true,
          deleted_by: null,
          deleted_date: null,
          edited_by: username,
          edited_date: this.nowJakartaIsoString(),
        },
        { new: true },
      )
      .lean();
    if (!restored) throw new NotFoundException('Material not found');
    return this.toApi(restored);
  }
}
