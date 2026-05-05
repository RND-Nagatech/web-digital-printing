import { Injectable, OnModuleInit, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { RolesService } from '../roles/roles.service';
import { UsersService } from '../users/users.service';
import { CustomersService } from '../customers/customers.service';
import { comparePassword } from '../../common/utils/password.util';
import { LoginDto } from './dto/login.dto';
import { RoleName } from '../../common/enums/role.enum';
import { RegisterCustomerDto } from '../customers/dto/register-customer.dto';
import { LoginCustomerDto } from '../customers/dto/login-customer.dto';
import { CustomerAuthUser } from './dto/customer-auth-response.dto';

@Injectable()
export class AuthService implements OnModuleInit {
  constructor(
    private readonly usersService: UsersService,
    private readonly customersService: CustomersService,
    private readonly rolesService: RolesService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) { }

  async onModuleInit() {
    let roles = await this.rolesService.findAll();
    if (!roles.length) {
      await this.rolesService.create({ name: RoleName.OWNER, permissions: ['*'] });
      await this.rolesService.create({
        name: RoleName.ADMIN,
        permissions: [
          'users:read', 'users:create', 'users:update', 'roles:read',
          'materials:read', 'orders:read', 'orders:update-status',
          'stores:read', 'stores:create', 'stores:update',
        ],
      });
      await this.rolesService.create({ name: RoleName.KASIR, permissions: ['orders:read', 'cash:read', 'cash:create'] });
      roles = await this.rolesService.findAll();
    }

    const adminRole = roles.find((r) => r.name === RoleName.ADMIN);
    if (adminRole) {
      const requiredAdminPermissions = ['stores:read', 'stores:create', 'stores:update'];
      const merged = Array.from(new Set([...(adminRole.permissions ?? []), ...requiredAdminPermissions]));
      const hasAll = requiredAdminPermissions.every((p) => (adminRole.permissions ?? []).includes(p));
      if (!hasAll) {
        await this.rolesService.update(String(adminRole._id), { permissions: merged });
      }
    }

    const ownerUsername = this.configService.get<string>('ownerUsername') ?? 'owner';
    const ownerEmail = this.configService.get<string>('ownerEmail') ?? 'owner@printflow.local';
    const ownerPassword = this.configService.get<string>('ownerPassword') ?? 'owner123';
    const adminUsername = this.configService.get<string>('adminUsername') ?? 'admin';
    const adminEmail = this.configService.get<string>('adminEmail') ?? 'admin@printflow.local';
    const adminPassword = this.configService.get<string>('adminPassword') ?? 'admin123';

    const users = await this.usersService.findAll();
    if (!users.length) {
      await this.usersService.create({ username: ownerUsername, email: ownerEmail, password: ownerPassword, role: RoleName.OWNER });
      await this.usersService.create({ username: adminUsername, email: adminEmail, password: adminPassword, role: RoleName.ADMIN });
      return;
    }

    const ownerByUsername = await this.usersService.findByUsername(ownerUsername);
    if (ownerByUsername && !ownerByUsername.email) {
      await this.usersService.update(String(ownerByUsername._id), { email: ownerEmail });
    }

    const adminByUsername = await this.usersService.findByUsername(adminUsername);
    if (adminByUsername && !adminByUsername.email) {
      await this.usersService.update(String(adminByUsername._id), { email: adminEmail });
    }
  }

  async login(dto: LoginDto) {
    const user =
      (await this.usersService.findByEmail(dto.email)) ||
      (dto.email.includes('@') ? null : await this.usersService.findByUsername(dto.email));

    if (!user) throw new UnauthorizedException('Email/password salah');

    const isValid = await comparePassword(dto.password, user.password);
    if (!isValid) throw new UnauthorizedException('Email/password salah');

    const role = await this.rolesService.findAll().then((rows) => rows.find((r) => r.name === user.role));
    const permissions = role?.permissions?.includes('*')
      ? [
        'users:create', 'users:read', 'users:update', 'users:delete', 'roles:create', 'roles:read', 'roles:update', 'roles:delete',
        'materials:create', 'materials:read', 'materials:update', 'materials:delete', 'eyelets:create', 'eyelets:read', 'eyelets:update', 'eyelets:delete',
        'banners:create', 'banners:read', 'banners:update', 'banners:delete', 'orders:create', 'orders:read', 'orders:update-status', 'orders:upload-payment',
        'cash:create', 'cash:read', 'cash:update', 'cash:delete', 'reports:read', 'stores:create', 'stores:read', 'stores:update', 'whatsapp:send', 'whatsapp:auto-reply',
      ]
      : (role?.permissions ?? []);

    const payload = { sub: String(user._id), username: user.username, role: user.role, permissions };
    return {
      access_token: await this.jwtService.signAsync(payload),
      user: { id: String(user._id), username: user.username, email: user.email, role: user.role, permissions },
    };
  }

  me(user: { id: string; username: string; role: string; permissions: string[] }) {
    return user;
  }

  async registerCustomer(dto: RegisterCustomerDto) {
    const customer = await this.customersService.register(dto);
    const payload = {
      sub: customer.id,
      actor: 'customer',
      kode_customer: customer.kode_customer,
      username: customer.username,
    };

    return {
      access_token: await this.jwtService.signAsync(payload),
      user: {
        id: customer.id,
        kode_customer: customer.kode_customer,
        email: customer.email,
        username: customer.username,
        nama: customer.nama,
        alamat: customer.alamat,
        no_hp: customer.no_hp,
        actor: 'customer',
      } as CustomerAuthUser,
    };
  }

  async loginCustomer(dto: LoginCustomerDto) {
    const customer = dto.emailOrUsername.includes('@')
      ? await this.customersService.findByEmail(dto.emailOrUsername)
      : await this.customersService.findByUsername(dto.emailOrUsername);

    if (!customer) throw new UnauthorizedException('Username/email atau password salah');

    const isValid = await comparePassword(dto.password, customer.password);
    if (!isValid) throw new UnauthorizedException('Username/email atau password salah');

    const payload = {
      sub: String(customer._id),
      actor: 'customer',
      kode_customer: customer.kode_customer,
      username: customer.username,
    };

    return {
      access_token: await this.jwtService.signAsync(payload),
      user: {
        id: String(customer._id),
        kode_customer: customer.kode_customer,
        email: customer.email,
        username: customer.username,
        nama: customer.nama,
        alamat: customer.alamat,
        no_hp: customer.no_hp,
        actor: 'customer',
      } as CustomerAuthUser,
    };
  }

  meCustomer(user: CustomerAuthUser) {
    if (user.actor !== 'customer') throw new UnauthorizedException('Invalid token');
    return user;
  }
}
