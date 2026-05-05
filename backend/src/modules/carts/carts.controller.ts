import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UploadedFiles, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { fileFilterBy, fileNamer } from '../../common/utils/upload.util';
import { CartsService } from './carts.service';
import { CreateCartDto } from './dto/create-cart.dto';
import { CheckoutCartDto } from './dto/checkout-cart.dto';
import { UpdateCartDto } from './dto/update-cart.dto';

const MAX_SIZE = 50 * 1024 * 1024;

@Controller('carts')
@UseGuards(JwtAuthGuard)
export class CartsController {
    constructor(private readonly service: CartsService) { }

    @Get('my')
    findMy(@Req() req: any) {
        if (req.user?.actor !== 'customer' || !req.user?.kode_customer) {
            return { items: [], meta: { total: 0 } };
        }
        return this.service.findMy(req.user.kode_customer);
    }

    @Post()
    @UseInterceptors(FileFieldsInterceptor([{ name: 'design_file', maxCount: 1 }, { name: 'payment_proof', maxCount: 1 }], {
        limits: { fileSize: MAX_SIZE },
        storage: diskStorage({
            destination: (_req, file, cb) => cb(null, file.fieldname === 'payment_proof' ? 'uploads/payment-proofs' : 'uploads/designs'),
            filename: fileNamer,
        }),
        fileFilter: (_req: any, file: any, cb: any) =>
            file.fieldname === 'payment_proof'
                ? fileFilterBy(['.jpg', '.jpeg', '.png'])(_req, file, cb)
                : fileFilterBy(['.pdf', '.jpg', '.jpeg', '.png', '.zip'])(_req, file, cb),
    }))
    create(
        @Req() req: any,
        @Body() dto: CreateCartDto,
        @UploadedFiles() files?: { design_file?: Express.Multer.File[]; payment_proof?: Express.Multer.File[] },
    ) {
        if (req.user?.actor !== 'customer' || !req.user?.kode_customer) {
            return { success: false, message: 'Forbidden' };
        }

        dto.nama_customer = req.user.nama ?? dto.nama_customer;
        dto.alamat = req.user.alamat ?? dto.alamat;
        dto.no_hp = req.user.no_hp ?? dto.no_hp;

        return this.service.create(
            req.user.kode_customer,
            dto,
            files?.design_file?.[0] ? `/uploads/designs/${files.design_file[0].filename}` : undefined,
            files?.payment_proof?.[0] ? `/uploads/payment-proofs/${files.payment_proof[0].filename}` : undefined,
        );
    }

    @Delete('my/clear')
    clearMy(@Req() req: any) {
        if (req.user?.actor !== 'customer' || !req.user?.kode_customer) {
            return { deleted: 0 };
        }
        return this.service.clearMy(req.user.kode_customer);
    }

    @Delete(':id')
    removeOne(@Req() req: any, @Param('id') id: string) {
        if (req.user?.actor !== 'customer' || !req.user?.kode_customer) {
            return { deleted: false };
        }
        return this.service.removeOne(req.user.kode_customer, id);
    }

    @Patch(':id')
    updateOne(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateCartDto) {
        if (req.user?.actor !== 'customer' || !req.user?.kode_customer) {
            return { success: false, message: 'Forbidden' };
        }
        return this.service.updateOne(req.user.kode_customer, id, dto);
    }

    @Post('checkout')
    checkout(@Req() req: any, @Body() dto: CheckoutCartDto) {
        if (req.user?.actor !== 'customer' || !req.user?.kode_customer) {
            return { checkedOut: 0 };
        }
        return this.service.checkout(req.user.kode_customer, dto.ids);
    }
}
