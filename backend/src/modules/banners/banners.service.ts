import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { unlink } from 'fs/promises';
import { join } from 'path';
import { CreateBannerDto } from './dto/create-banner.dto';
import { UpdateBannerDto } from './dto/update-banner.dto';
import { Banner } from './schemas/banner.schema';
import { Material } from '../materials/schemas/material.schema';

@Injectable()
export class BannersService {
  constructor(
    @InjectModel(Banner.name) private readonly model: Model<Banner>,
    @InjectModel(Material.name) private readonly materialModel: Model<Material>,
  ) {}

  private nowJakartaIsoString() {
    const base = new Date();
    const shifted = new Date(base.getTime() + 7 * 60 * 60 * 1000);
    return shifted.toISOString().replace('Z', '+07:00');
  }

  private async resolveMaterial(materialId: string) {
    const mat = await this.materialModel.findById(materialId).lean();
    if (!mat) throw new NotFoundException('Material not found');
    return {
      kode_bahan: mat.kode_bahan,
      nama_bahan: mat.nama_bahan ?? '-',
      deskripsi: mat.deskripsi ?? '',
    };
  }

  private mapBanner(d: any) {
    return {
      _id: String(d._id),
      kode_bahan: d.kode_bahan,
      title: d.title,
      image_url: d.image_url,
      deleted_by: d.deleted_by ?? null,
      deleted_date: d.deleted_date ?? null,
      created_at: d.created_at ?? null,
      material_name: d.material_name ?? '-',
      material_description: d.material_description ?? '',
    };
  }

  async create(dto: CreateBannerDto & { image_url: string }) {
    const mat = await this.resolveMaterial(dto.material_id);
    const created = await this.model.create({
      kode_bahan: mat.kode_bahan,
      title: dto.title.trim(),
      image_url: dto.image_url,
      deleted_by: null,
      deleted_date: null,
      created_at: this.nowJakartaIsoString(),
    });
    return this.mapBanner({ ...created.toObject(), material_name: mat.nama_bahan, material_description: mat.deskripsi });
  }

  async findAll() {
    const rows = await this.model.find().sort({ created_at: -1 }).lean();
    const bahan = await this.materialModel.find({ status_delete: false }).lean();
    const byCode = new Map((bahan as any[]).map((m) => [m.kode_bahan, { name: m.nama_bahan ?? '-', desc: m.deskripsi ?? '' }]));
    return rows.map((r: any) =>
      this.mapBanner({
        ...r,
        material_name: byCode.get(r.kode_bahan)?.name ?? '-',
        material_description: byCode.get(r.kode_bahan)?.desc ?? '',
      }),
    );
  }

  async update(id: string, dto: UpdateBannerDto & { image_url?: string }) {
    const existing = await this.model.findById(id).lean();
    if (!existing) throw new NotFoundException('Banner not found');

    let patch: any = { ...dto };
    let materialName = '';
    let materialDesc = '';
    if ((dto as any).material_id) {
      const mat = await this.resolveMaterial((dto as any).material_id);
      patch = { ...patch, kode_bahan: mat.kode_bahan };
      materialName = mat.nama_bahan;
      materialDesc = mat.deskripsi;
      delete patch.material_id;
    }

    const updated = await this.model.findByIdAndUpdate(id, patch, { new: true }).lean();
    if (!updated) throw new NotFoundException('Banner not found');
    return this.mapBanner({ ...updated, material_name: materialName || '-', material_description: materialDesc || '' });
  }

  async remove(id: string, username: string) {
    const d = await this.model.findById(id).lean();
    if (!d) throw new NotFoundException('Banner not found');

    if (d.image_url) {
      const relative = d.image_url.startsWith('/') ? d.image_url.slice(1) : d.image_url;
      const abs = join(process.cwd(), relative);
      try {
        await unlink(abs);
      } catch {
        // no-op if file already missing
      }
    }

    await this.model.findByIdAndDelete(id).lean();
    return {
      deleted: true,
      deleted_by: username,
      deleted_date: this.nowJakartaIsoString(),
    };
  }
}
