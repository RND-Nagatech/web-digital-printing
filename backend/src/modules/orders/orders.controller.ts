import { Body, Controller, Get, Param, ParseIntPipe, Post, Put, Query, Req, UploadedFile, UploadedFiles, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileFieldsInterceptor, FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { fileFilterBy, fileNamer } from '../../common/utils/upload.util';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { OrdersService } from './orders.service';

const MAX_SIZE = 50 * 1024 * 1024;

@Controller('orders')
export class OrdersController {
  constructor(private readonly service: OrdersService) { }

  @Get()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('orders:read')
  findAll(
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 20,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('date') date?: string,
    @Query('date_start') dateStart?: string,
    @Query('date_end') dateEnd?: string,
    @Query('payment_status') paymentStatus?: string,
  ) {
    return this.service.findAll(page, limit, search, status, date, dateStart, dateEnd, paymentStatus);
  }

  @Get('my')
  @UseGuards(JwtAuthGuard)
  findMyOrders(
    @Req() req: any,
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 20,
    @Query('status') status?: string,
    @Query('payment_status') paymentStatus?: string,
  ) {
    if (req.user?.actor !== 'customer' || !req.user?.kode_customer) {
      return { items: [], meta: { page, limit, total: 0, totalPages: 0 } };
    }
    return this.service.findMyOrders(req.user.kode_customer, page, limit, status, paymentStatus);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('orders:read')
  findById(@Param('id') id: string) { return this.service.findById(id); }

  @Get(':id/follow-up-message')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('orders:read')
  followUpMessage(@Param('id') id: string) { return this.service.getFollowUpMessage(id); }

  @Post()
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileFieldsInterceptor([{ name: 'design_file', maxCount: 1 }, { name: 'design_files', maxCount: 20 }, { name: 'payment_proof', maxCount: 1 }], {
    limits: { fileSize: MAX_SIZE },
    storage: diskStorage({ destination: (_req, file, cb) => cb(null, file.fieldname === 'payment_proof' ? 'uploads/payment-proofs' : 'uploads/designs'), filename: fileNamer }),
    fileFilter: (_req: any, file: any, cb: any) =>
      file.fieldname === 'payment_proof'
        ? fileFilterBy(['.jpg', '.jpeg', '.png'])(_req, file, cb)
        : fileFilterBy(['.pdf', '.jpg', '.jpeg', '.png', '.zip'])(_req, file, cb),
  }))
  create(
    @Req() req: any,
    @Body() dto: CreateOrderDto,
    @UploadedFiles() files?: { design_file?: Express.Multer.File[]; design_files?: Express.Multer.File[]; payment_proof?: Express.Multer.File[] },
  ) {
    if (req.user?.actor === 'customer') {
      dto.kode_customer = req.user.kode_customer;
      dto.nama_customer = req.user.nama ?? dto.nama_customer;
      dto.alamat = req.user.alamat ?? dto.alamat;
      dto.no_hp = req.user.no_hp ?? dto.no_hp;
    }

    const uploadedDesigns = files?.design_files ?? [];
    if (uploadedDesigns.length > 0) {
      dto.items = (dto.items ?? []).map((item, idx) => ({
        ...item,
        design_file: uploadedDesigns[idx] ? `/uploads/designs/${uploadedDesigns[idx].filename}` : (item.design_file ?? ''),
      }));
    }

    return this.service.create(
      dto,
      files?.design_file?.[0] ? `/uploads/designs/${files.design_file[0].filename}` : undefined,
      files?.payment_proof?.[0] ? `/uploads/payment-proofs/${files.payment_proof[0].filename}` : undefined,
    );
  }

  @Put(':id/status')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('orders:update-status')
  updateStatus(@Param('id') id: string, @Body() dto: UpdateOrderStatusDto, @Req() req: any) {
    return this.service.updateStatus(id, dto, req.user?.username);
  }

  @Post(':id/payment-proof')
  @UseInterceptors(FileInterceptor('payment_proof', {
    limits: { fileSize: MAX_SIZE },
    storage: diskStorage({ destination: 'uploads/payment-proofs', filename: fileNamer }),
    fileFilter: fileFilterBy(['.jpg', '.jpeg', '.png']),
  }))
  uploadProof(@Param('id') id: string, @UploadedFile() file: Express.Multer.File) { return this.service.uploadPaymentProof(id, `/uploads/payment-proofs/${file.filename}`); }

  @Post(':id/settle-cash')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('orders:update-status')
  settleCash(@Param('id') id: string, @Req() req: any) {
    return this.service.settleCashPayment(id, req.user?.username);
  }
}
