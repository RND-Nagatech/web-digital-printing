import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { Role } from './schemas/role.schema';

@Injectable()
export class RolesService {
  constructor(@InjectModel(Role.name) private readonly roleModel: Model<Role>) {}

  create(dto: CreateRoleDto) {
    return this.roleModel.create(dto);
  }

  findAll() {
    return this.roleModel.find().sort({ created_at: -1 }).lean();
  }

  async findOne(id: string) {
    const data = await this.roleModel.findById(id).lean();
    if (!data) throw new NotFoundException('Role not found');
    return data;
  }

  async update(id: string, dto: UpdateRoleDto) {
    const data = await this.roleModel.findByIdAndUpdate(id, dto, { new: true, runValidators: true }).lean();
    if (!data) throw new NotFoundException('Role not found');
    return data;
  }

  async remove(id: string) {
    const data = await this.roleModel.findByIdAndDelete(id).lean();
    if (!data) throw new NotFoundException('Role not found');
    return { deleted: true };
  }
}
