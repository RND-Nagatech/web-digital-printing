import { Body, Controller, Delete, Get, Param, Post, Put, Query, Req, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { Request } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { fileFilterBy, fileNamer } from '../../common/utils/upload.util';
import { CreateBannerDto } from './dto/create-banner.dto';
import { UpdateBannerDto } from './dto/update-banner.dto';
import { BannersService } from './banners.service';

const MAX_SIZE = 50 * 1024 * 1024;

@Controller('banners')
export class BannersController {
  constructor(private readonly service: BannersService) {}

  @Get()
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    if (!page && !limit && !search) {
      return this.service.findAllRaw();
    }
    const p = Math.max(1, Number(page) || 1);
    const l = Math.min(100, Math.max(1, Number(limit) || 10));
    return this.service.findAll(p, l, search);
  }

  @Post()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('banners:create')
  @UseInterceptors(FileInterceptor('image', { limits: { fileSize: MAX_SIZE }, storage: diskStorage({ destination: 'uploads/banners', filename: fileNamer }), fileFilter: fileFilterBy(['.jpg', '.jpeg', '.png']) }))
  create(@Body() dto: CreateBannerDto, @UploadedFile() image?: Express.Multer.File) {
    return this.service.create({ ...dto, image_url: image ? `/uploads/banners/${image.filename}` : '' });
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('banners:update')
  @UseInterceptors(FileInterceptor('image', { limits: { fileSize: MAX_SIZE }, storage: diskStorage({ destination: 'uploads/banners', filename: fileNamer }), fileFilter: fileFilterBy(['.jpg', '.jpeg', '.png']) }))
  update(@Param('id') id: string, @Body() dto: UpdateBannerDto, @UploadedFile() image?: Express.Multer.File) {
    return this.service.update(id, { ...dto, ...(image ? { image_url: `/uploads/banners/${image.filename}` } : {}) });
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('banners:delete')
  remove(@Param('id') id: string, @Req() req: Request & { user?: { username?: string } }) {
    return this.service.remove(id, req.user?.username ?? 'system');
  }
}
