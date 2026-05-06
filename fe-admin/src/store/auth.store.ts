import { create } from 'zustand';
import { AuthUser, Role } from '@/types/user';
import { authService } from '@/services/auth.service';

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  loginAs: (role: Role) => Promise<void>;
  logout: () => Promise<void>;
  hydrate: () => void;
  hasPermission: (key: string) => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: authService.getCurrentUser(),
  loading: false,
  hydrate: () => set({ user: authService.getCurrentUser() }),
  login: async (email, password, rememberMe = true) => {
    set({ loading: true });
    try {
      const user = await authService.login(email, password, rememberMe);
      set({ user });
    } finally {
      set({ loading: false });
    }
  },
  loginAs: async (role) => {
    set({ loading: true });
    try {
      const user = await authService.loginAs(role);
      set({ user });
    } finally {
      set({ loading: false });
    }
  },
  logout: async () => {
    await authService.logout();
    set({ user: null });
  },
  hasPermission: (key) => {
    const u = get().user;
    if (!u) return false;

    // Owner always has full access in admin UI.
    if (u.role === 'owner') return true;

    const permissions = new Set(u.permissions ?? []);

    if (permissions.has(key)) return true;
    if (permissions.has('*')) return true;

    // Backward-compatible module aliases used by old route/menu checks.
    if (key === 'dashboard') return true;
    if (key === 'transaksi') return permissions.has('orders:read');
    if (key === 'keuangan') return permissions.has('cash:read');
    if (key === 'whatsapp') return permissions.has('whatsapp:send') || permissions.has('whatsapp:auto-reply');
    if (key === 'master') {
      return [
        'materials:read',
        'sizes:read',
        'eyelets:read',
        'banners:read',
        'stores:read',
        'users:read',
        'roles:read',
      ].some((perm) => permissions.has(perm));
    }

    // Report sub-menu keys: use explicit menu permissions when configured,
    // otherwise fall back to legacy reports:read behavior.
    if (key === 'menu:laporan:keuangan' || key === 'menu:laporan:managerial' || key === 'menu:laporan:transaksi-penjualan') {
      const hasExplicitLaporanMenu =
        permissions.has('menu:laporan:keuangan')
        || permissions.has('menu:laporan:managerial')
        || permissions.has('menu:laporan:transaksi-penjualan');
      if (hasExplicitLaporanMenu) return permissions.has(key);
      return permissions.has('reports:read');
    }

    if (key === 'laporan') {
      return (
        permissions.has('menu:laporan:keuangan') ||
        permissions.has('menu:laporan:managerial') ||
        permissions.has('menu:laporan:transaksi-penjualan') ||
        permissions.has('reports:read')
      );
    }

    return false;
  },
}));
