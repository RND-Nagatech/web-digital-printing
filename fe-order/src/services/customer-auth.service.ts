import { api } from './api';
import type { CustomerUser } from '@/types';

type ApiWrap<T> = { success: boolean; message: string; data: T };

type AuthData = {
    access_token: string;
    user: CustomerUser;
};

export const CustomerAuthService = {
    async register(payload: {
        email: string;
        username: string;
        password: string;
        nama: string;
        alamat: string;
        no_hp: string;
    }) {
        const res = await api.post<ApiWrap<AuthData>>('/auth/customer/register', payload);
        return res.data.data;
    },

    async login(payload: { emailOrUsername: string; password: string }) {
        const res = await api.post<ApiWrap<AuthData>>('/auth/customer/login', payload);
        return res.data.data;
    },

    async me() {
        const res = await api.get<ApiWrap<CustomerUser>>('/auth/customer/me');
        return res.data.data;
    },
};
