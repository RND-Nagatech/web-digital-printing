import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { Model } from 'mongoose';
import { comparePassword, hashPassword } from '../../common/utils/password.util';
import { ChangePasswordDto } from './dto/change-password.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './schemas/user.schema';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<User>,
    private readonly configService: ConfigService,
  ) { }

  private nowJakartaIsoString() {
    const base = new Date();
    const shifted = new Date(base.getTime() + 7 * 60 * 60 * 1000);
    return shifted.toISOString().replace('Z', '+07:00');
  }

  async create(dto: CreateUserDto, editedBy = 'system') {
    const usernameUpper = dto.username.trim().toUpperCase();
    const emailLower = dto.email.toLowerCase();
    const [usernameExists, emailExists] = await Promise.all([
      this.userModel.exists({ username: usernameUpper }),
      this.userModel.exists({ email: emailLower }),
    ]);
    if (usernameExists) throw new ConflictException('Username already exists');
    if (emailExists) throw new ConflictException('Email already exists');

    const rounds = this.configService.get<number>('bcryptRounds', 10);
    const hashed = await hashPassword(dto.password, rounds);

    return this.userModel.create({
      ...dto,
      username: usernameUpper,
      email: emailLower,
      password: hashed,
      status_delete: false,
      edited_by: editedBy,
      edited_date: this.nowJakartaIsoString(),
      deleted_by: null,
      deleted_date: null,
      created_at: this.nowJakartaIsoString(),
    });
  }

  findAll() {
    return this.userModel.find({ status_delete: { $ne: true } }, { password: 0 }).sort({ created_at: -1 }).lean();
  }

  async findOne(id: string) {
    const data = await this.userModel.findOne({ _id: id, status_delete: { $ne: true } }, { password: 0 }).lean();
    if (!data) throw new NotFoundException('User not found');
    return data;
  }

  findByUsername(username: string) {
    return this.userModel.findOne({ username: username.trim().toUpperCase(), status_delete: { $ne: true } }).lean();
  }

  findByEmail(email: string) {
    return this.userModel.findOne({ email: email.toLowerCase(), status_delete: { $ne: true } }).lean();
  }

  async update(id: string, dto: UpdateUserDto, editedBy = 'system') {
    const payload: Record<string, unknown> = { ...dto };
    if (dto.email) payload.email = dto.email.toLowerCase();
    if (dto.username) payload.username = dto.username.trim().toUpperCase();
    if (dto.password) {
      const rounds = this.configService.get<number>('bcryptRounds', 10);
      payload.password = await hashPassword(dto.password, rounds);
    }
    payload.edited_by = editedBy;
    payload.edited_date = this.nowJakartaIsoString();

    const data = await this.userModel
      .findOneAndUpdate({ _id: id, status_delete: { $ne: true } }, payload, { new: true, runValidators: true, projection: { password: 0 } })
      .lean();
    if (!data) throw new NotFoundException('User not found');
    return data;
  }

  async remove(id: string, deletedBy = 'system') {
    const data = await this.userModel
      .findOneAndUpdate(
        { _id: id, status_delete: { $ne: true } },
        {
          status_delete: true,
          deleted_by: deletedBy,
          deleted_date: this.nowJakartaIsoString(),
          edited_by: deletedBy,
          edited_date: this.nowJakartaIsoString(),
        },
        { new: true },
      )
      .lean();
    if (!data) throw new NotFoundException('User not found');
    return { deleted: true };
  }

  async changePassword(userId: string, dto: ChangePasswordDto, editedBy = 'system') {
    if (!userId) throw new NotFoundException('User not found');
    if (dto.newPassword !== dto.confirmNewPassword) {
      throw new BadRequestException('Konfirmasi password baru tidak cocok');
    }
    if (dto.currentPassword === dto.newPassword) {
      throw new BadRequestException('Password baru harus berbeda dari password lama');
    }

    const user = await this.userModel.findOne({ _id: userId, status_delete: { $ne: true } }).lean();
    if (!user) throw new NotFoundException('User not found');

    const isMatch = await comparePassword(dto.currentPassword, user.password);
    if (!isMatch) throw new BadRequestException('Password saat ini tidak sesuai');

    const rounds = this.configService.get<number>('bcryptRounds', 10);
    const hashed = await hashPassword(dto.newPassword, rounds);

    await this.userModel.updateOne(
      { _id: userId, status_delete: { $ne: true } },
      {
        $set: {
          password: hashed,
          edited_by: editedBy,
          edited_date: this.nowJakartaIsoString(),
        },
      },
    );

    return { success: true };
  }
}
