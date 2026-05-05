import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateStoreDto } from './dto/create-store.dto';
import { UpdateStoreDto } from './dto/update-store.dto';
import { Store } from './schemas/store.schema';

@Injectable()
export class StoresService {
    constructor(@InjectModel(Store.name) private readonly model: Model<Store>) { }

    private nowWibIso(): string {
        return new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString().replace('Z', '+07:00');
    }

    private toApi(doc: any) {
        return {
            _id: String(doc._id),
            kode_toko: doc.kode_toko,
            nama_toko: doc.nama_toko,
            no_hp: doc.no_hp,
            alamat: doc.alamat,
            created_at: doc.created_at,
            edited_by: doc.edited_by,
            edited_date: doc.edited_date,
        };
    }

    private createStoreCodeBase(rawName: string): string {
        const normalized = rawName.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
        if (!normalized) return 'TOK';
        if (normalized.length >= 3) return normalized.slice(0, 3);
        return normalized.padEnd(3, 'X');
    }

    private async generateNextStoreCode(namaToko: string): Promise<string> {
        const base = this.createStoreCodeBase(namaToko);
        const regex = new RegExp(`^${base}(\\d+)?$`);
        const existing = await this.model.find({ kode_toko: { $regex: regex } }).select('kode_toko').lean();

        if (!existing.length) return base;

        let maxSequence = 1;
        for (const row of existing) {
            const suffix = row.kode_toko.slice(base.length);
            if (!suffix) {
                maxSequence = Math.max(maxSequence, 1);
                continue;
            }
            const seq = Number.parseInt(suffix, 10);
            if (!Number.isNaN(seq)) maxSequence = Math.max(maxSequence, seq);
        }

        const next = maxSequence + 1;
        const suffix = next < 100 ? String(next).padStart(2, '0') : String(next);
        return `${base}${suffix}`;
    }

    async findAll(page = 1, limit = 10, search?: string) {
        const query: Record<string, unknown> = {};
        if (search?.trim()) {
            const regex = new RegExp(search.trim(), 'i');
            query.$or = [
                { nama_toko: regex },
                { kode_toko: regex },
                { alamat: regex },
                { no_hp: regex },
            ];
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

    async create(dto: CreateStoreDto) {
        const namaToko = dto.nama_toko.trim().toUpperCase();
        const alamat = dto.alamat.trim().toUpperCase();
        const noHp = dto.no_hp.trim();
        const kodeToko = await this.generateNextStoreCode(namaToko);

        const created = await this.model.create({
            kode_toko: kodeToko,
            nama_toko: namaToko,
            no_hp: noHp,
            alamat,
            created_at: this.nowWibIso(),
            edited_by: '-',
            edited_date: '-',
        });

        return this.toApi(created);
    }

    async update(id: string, dto: UpdateStoreDto, editedBy = 'system') {
        const patch: Record<string, unknown> = {
            edited_by: editedBy,
            edited_date: this.nowWibIso(),
        };

        if (dto.nama_toko !== undefined) patch.nama_toko = dto.nama_toko.trim().toUpperCase();
        if (dto.no_hp !== undefined) patch.no_hp = dto.no_hp.trim();
        if (dto.alamat !== undefined) patch.alamat = dto.alamat.trim().toUpperCase();

        const updated = await this.model.findByIdAndUpdate(id, patch, { new: true, runValidators: true }).lean();
        if (!updated) throw new NotFoundException('Store not found');
        return this.toApi(updated);
    }
}
