import { Body, Controller, Delete, Get, Param, Post, Put, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { CreateUserDto } from './dto/create-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';

@Controller('users')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) { }

  @Post()
  @Permissions('users:create')
  create(@Body() dto: CreateUserDto, @Req() req: Request & { user?: { username?: string } }) {
    return this.usersService.create(dto, req.user?.username ?? 'system');
  }

  @Get()
  @Permissions('users:read')
  findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  @Permissions('users:read')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Put(':id')
  @Permissions('users:update')
  update(@Param('id') id: string, @Body() dto: UpdateUserDto, @Req() req: Request & { user?: { username?: string } }) {
    return this.usersService.update(id, dto, req.user?.username ?? 'system');
  }

  @Delete(':id')
  @Permissions('users:delete')
  remove(@Param('id') id: string, @Req() req: Request & { user?: { username?: string } }) {
    return this.usersService.remove(id, req.user?.username ?? 'system');
  }

  @Post('change-password')
  changePassword(
    @Body() dto: ChangePasswordDto,
    @Req() req: Request & { user?: { id?: string; username?: string } },
  ) {
    return this.usersService.changePassword(
      req.user?.id ?? '',
      dto,
      req.user?.username ?? 'system',
    );
  }
}
