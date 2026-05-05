import { create } from 'zustand';
import type { CustomerUser } from '@/types';

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'customer-auth-user';

const readToken = () => localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);
const readUser = (): CustomerUser | null => {
    const raw = localStorage.getItem(USER_KEY) || sessionStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
        return JSON.parse(raw) as CustomerUser;
    } catch {
        return null;
    }
};

type AuthState = {
    token: string | null;
    user: CustomerUser | null;
    isAuthenticated: boolean;
    setAuth: (token: string, user: CustomerUser, rememberMe?: boolean) => void;
    clearAuth: () => void;
};

export const useAuthStore = create<AuthState>((set) => {
    const initialToken = readToken();
    const initialUser = readUser();

    return {
        token: initialToken,
        user: initialUser,
        isAuthenticated: Boolean(initialToken && initialUser),
        setAuth: (token, user, rememberMe = true) => {
            const storage = rememberMe ? localStorage : sessionStorage;
            const otherStorage = rememberMe ? sessionStorage : localStorage;

            otherStorage.removeItem(TOKEN_KEY);
            otherStorage.removeItem(USER_KEY);

            storage.setItem(TOKEN_KEY, token);
            storage.setItem(USER_KEY, JSON.stringify(user));
            set({ token, user, isAuthenticated: true });
        },
        clearAuth: () => {
            localStorage.removeItem(TOKEN_KEY);
            localStorage.removeItem(USER_KEY);
            sessionStorage.removeItem(TOKEN_KEY);
            sessionStorage.removeItem(USER_KEY);
            set({ token: null, user: null, isAuthenticated: false });
        },
    };
});
