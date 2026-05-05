import { Body, Controller, Get, Param, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { StoresService } from './stores.service';
import { CreateStoreDto } from './dto/create-store.dto';
import { UpdateStoreDto } from './dto/update-store.dto';

@Controller('stores')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class StoresController {
    constructor(private readonly service: StoresService) { }

    @Get()
    @Permissions('stores:read')
    findAll(@Query('page') page?: string, @Query('limit') limit?: string, @Query('search') search?: string) {
        const p = Math.max(1, Number(page) || 1);
        const l = Math.min(100, Math.max(1, Number(limit) || 10));
        return this.service.findAll(p, l, search);
    }

    @Post()
    @Permissions('stores:create')
    create(@Body() dto: CreateStoreDto) {
        return this.service.create(dto);
    }

    @Put(':id')
    @Permissions('stores:update')
    update(@Param('id') id: string, @Body() dto: UpdateStoreDto, @Req() req: Request & { user?: { username?: string } }) {
        return this.service.update(id, dto, req.user?.username ?? 'system');
    }
}
