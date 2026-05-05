import { apiPostData } from './api';
import { AuthUser, Role } from '@/types/user';
import { AuthUserDto, LoginRequestDto, LoginResponseDto } from '@/types/dto/auth.dto';

const mapUser = (u: AuthUserDto): AuthUser => ({
  id: u.id,
  name: u.username,
  email: u.email ?? `${u.username}@local`,
  role: u.role,
  active: true,
  createdAt: new Date().toISOString(),
  permissions: u.permissions ?? [],
});

export const authService = {
  login: async (email: string, password: string, rememberMe = true): Promise<AuthUser> => {
    const data = await apiPostData<LoginResponseDto, LoginRequestDto>('/auth/login', { email, password });
    const storage = rememberMe ? localStorage : sessionStorage;
    const otherStorage = rememberMe ? sessionStorage : localStorage;

    otherStorage.removeItem('printflow_token');
    otherStorage.removeItem('printflow_user');

    storage.setItem('printflow_token', data.access_token);
    const authUser = mapUser(data.user);
    storage.setItem('printflow_user', JSON.stringify(authUser));
    return authUser;
  },
  loginAs: async (role: Role): Promise<AuthUser> => authService.login(`${role}@printflow.local`, `${role}123`),
  changePassword: async (payload: {
    currentPassword: string;
    newPassword: string;
    confirmNewPassword: string;
  }) => {
    return apiPostData<{ success: boolean }, typeof payload>('/users/change-password', payload);
  },
  logout: async () => {
    localStorage.removeItem('printflow_token');
    localStorage.removeItem('printflow_user');
    sessionStorage.removeItem('printflow_token');
    sessionStorage.removeItem('printflow_user');
    return { success: true };
  },
  getCurrentUser: (): AuthUser | null => {
    const raw = localStorage.getItem('printflow_user') || sessionStorage.getItem('printflow_user');
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  },
};
