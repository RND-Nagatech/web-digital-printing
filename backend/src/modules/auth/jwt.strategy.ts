import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UsersService } from '../users/users.service';
import { CustomersService } from '../customers/customers.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly usersService: UsersService,
    private readonly customersService: CustomersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('jwtSecret'),
    });
  }

  async validate(payload: {
    sub: string;
    username: string;
    role?: string;
    permissions?: string[];
    actor?: 'customer';
    kode_customer?: string;
  }) {
    if (payload.actor === 'customer') {
      let customer: Awaited<ReturnType<CustomersService['findById']>> | null = null;
      try {
        customer = await this.customersService.findById(payload.sub);
      } catch {
        throw new UnauthorizedException('Invalid token');
      }
      if (!customer) throw new UnauthorizedException('Invalid token');
      return {
        id: String(customer._id),
        actor: 'customer' as const,
        kode_customer: customer.kode_customer,
        username: customer.username,
        email: customer.email,
        nama: customer.nama,
        alamat: customer.alamat,
        no_hp: customer.no_hp,
        permissions: [],
      };
    }

    let user: Awaited<ReturnType<UsersService['findOne']>> | null = null;
    try {
      user = await this.usersService.findOne(payload.sub);
    } catch {
      throw new UnauthorizedException('Invalid token');
    }
    if (!user) throw new UnauthorizedException('Invalid token');
    return {
      id: payload.sub,
      username: payload.username,
      role: payload.role,
      permissions: payload.permissions ?? [],
    };
  }
}
