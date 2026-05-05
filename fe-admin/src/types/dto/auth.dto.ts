import { Role } from '@/types/user';

export interface LoginRequestDto {
  email: string;
  password: string;
}

export interface AuthUserDto {
  id: string;
  username: string;
  email?: string;
  role: Role;
  permissions: string[];
}

export interface LoginResponseDto {
  access_token: string;
  user: AuthUserDto;
}
