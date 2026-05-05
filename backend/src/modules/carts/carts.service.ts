import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { OrdersService } from '../orders/orders.service';
import { MaterialsService } from '../materials/materials.service';
import { CreateOrderDto } from '../orders/dto/create-order.dto';
import { Cart } from './schemas/cart.schema';
import { CreateCartDto } from './dto/create-cart.dto';
import { UpdateCartDto } from './dto/update-cart.dto';

@Injectable()
export class CartsService {
    constructor(
        @InjectModel(Cart.name) private readonly model: Model<Cart>,
        private readonly ordersService: OrdersService,
        private readonly materialsService: MaterialsService,
    ) { }

    async findMy(kodeCustomer: string) {
        const rows = await this.model.find({ kode_customer: kodeCustomer }).sort({ created_at: -1 }).lean();
        const items = await this.repriceCarts(rows);
        return { items, meta: { total: items.length } };
    }

    private async repriceCarts(carts: any[]) {
        if (!carts.length) return carts;

        const codeSet = new Set<string>();
        carts.forEach((cart) => {
            (cart.items ?? []).forEach((item: any) => {
                if (item?.kode_bahan) codeSet.add(String(item.kode_bahan).trim().toUpperCase());
            });
        });

        const prices = new Map<string, number>();
        await Promise.all(
            Array.from(codeSet).map(async (code) => {
                try {
                    const material = await this.materialsService.findByCode(code);
                    prices.set(code, Number(material.price_per_meter ?? 0));
                } catch {
                    // Keep existing cart total when a material cannot be resolved.
                }
            }),
        );

        const updates: Array<Promise<any>> = [];

        const repriced = carts.map((cart) => {
            let unresolved = false;
            let nextTotal = 0;

            for (const item of cart.items ?? []) {
                const code = String(item?.kode_bahan ?? '').trim().toUpperCase();
                const pricePerMeter = prices.get(code);
                if (pricePerMeter === undefined) {
                    unresolved = true;
                    break;
                }

                const panjang = Number(item?.panjang ?? 0);
                const lebar = Number(item?.lebar ?? 0);
                const quantity = Math.max(1, Number(item?.quantity ?? 1));
                const area = panjang * lebar;
                const hargaSatuan = Math.round(pricePerMeter * area);
                nextTotal += hargaSatuan * quantity;
            }

            if (unresolved) return cart;

            const normalizedTotal = Math.max(0, Math.round(nextTotal));
            if (normalizedTotal !== Number(cart.estimated_total ?? 0)) {
                updates.push(
                    this.model.updateOne(
                        { _id: cart._id, kode_customer: cart.kode_customer },
                        { $set: { estimated_total: normalizedTotal } },
                    ),
                );
            }

            return { ...cart, estimated_total: normalizedTotal };
        });

        if (updates.length) await Promise.all(updates);
        return repriced;
    }

    async create(kodeCustomer: string, dto: CreateCartDto, designFile?: string, paymentProof?: string) {
        if (dto.payment_method === 'dp' && (!dto.dp_amount || dto.dp_amount <= 0)) {
            throw new BadRequestException('Masukkan jumlah DP');
        }

        if ((dto.payment_method === 'dp' || dto.payment_method === 'pay_now') && !paymentProof) {
            throw new BadRequestException('Bukti transfer wajib diupload untuk metode ini');
        }

        const created = await this.model.create({
            kode_customer: kodeCustomer,
            nama_customer: dto.nama_customer,
            no_hp: dto.no_hp,
            alamat: dto.alamat,
            items: dto.items,
            payment_method: dto.payment_method,
            dp_amount: dto.dp_amount ?? 0,
            notes: dto.notes,
            estimated_total: dto.estimated_total ?? 0,
            design_file: designFile,
            payment_proof: paymentProof,
            created_at: new Date(),
        });

        return created;
    }

    async removeOne(kodeCustomer: string, id: string) {
        const removed = await this.model.findOneAndDelete({ _id: id, kode_customer: kodeCustomer }).lean();
        if (!removed) throw new NotFoundException('Item keranjang tidak ditemukan');
        return { deleted: true };
    }

    async updateOne(kodeCustomer: string, id: string, dto: UpdateCartDto) {
        if (!dto.items && dto.estimated_total === undefined) {
            throw new BadRequestException('Tidak ada data yang diupdate');
        }

        const payload: Record<string, any> = {};
        if (dto.items) payload.items = dto.items;
        if (dto.estimated_total !== undefined) payload.estimated_total = dto.estimated_total;

        const updated = await this.model
            .findOneAndUpdate(
                { _id: id, kode_customer: kodeCustomer },
                { $set: payload },
                { new: true },
            )
            .lean();

        if (!updated) throw new NotFoundException('Item keranjang tidak ditemukan');
        return updated;
    }

    async clearMy(kodeCustomer: string) {
        const result = await this.model.deleteMany({ kode_customer: kodeCustomer });
        return { deleted: result.deletedCount ?? 0 };
    }

    async checkout(kodeCustomer: string, ids?: string[]) {
        const query: Record<string, any> = { kode_customer: kodeCustomer };
        if (ids?.length) query._id = { $in: ids };

        const carts = await this.model.find(query).lean();
        if (carts.length === 0) throw new BadRequestException('Tidak ada item keranjang yang dipilih');

        for (const item of carts) {
            const dto: CreateOrderDto = {
                kode_customer: item.kode_customer,
                nama_customer: item.nama_customer,
                no_hp: item.no_hp,
                alamat: item.alamat,
                items: item.items.map((x) => ({
                    kode_bahan: x.kode_bahan,
                    panjang: x.panjang,
                    lebar: x.lebar,
                    quantity: x.quantity,
                    mata_ayam: x.mata_ayam,
                })),
                notes: item.notes,
                dp_amount: item.payment_method === 'dp' ? item.dp_amount : undefined,
            };

            await this.ordersService.create(dto, item.design_file, item.payment_proof);
        }

        await this.model.deleteMany({ _id: { $in: carts.map((x: any) => x._id) }, kode_customer: kodeCustomer });

        return { checkedOut: carts.length };
    }
}
