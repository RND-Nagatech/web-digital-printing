import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterCustomerDto } from '../customers/dto/register-customer.dto';
import { LoginCustomerDto } from '../customers/dto/login-customer.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@Req() req: any) {
    return this.authService.me(req.user as any);
  }

  @Post('customer/register')
  registerCustomer(@Body() dto: RegisterCustomerDto) {
    return this.authService.registerCustomer(dto);
  }

  @Post('customer/login')
  loginCustomer(@Body() dto: LoginCustomerDto) {
    return this.authService.loginCustomer(dto);
  }

  @Get('customer/me')
  @UseGuards(JwtAuthGuard)
  meCustomer(@Req() req: any) {
    return this.authService.meCustomer(req.user as any);
  }
}
