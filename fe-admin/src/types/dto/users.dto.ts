import { Role } from '@/types/user';

export interface UserEntityDto {
  _id: string;
  username: string;
  email?: string;
  role: Role;
  created_at: string;
}

export interface CreateUserRequestDto {
  username: string;
  email: string;
  password: string;
  role: Role;
}

export interface UpdateUserRequestDto {
  username?: string;
  email?: string;
  role?: Role;
}
