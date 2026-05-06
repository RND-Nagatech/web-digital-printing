import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppLayout } from "./layouts/AppLayout";
import { ProtectedRoute } from "./components/common/ProtectedRoute";
import { useAuthStore } from "./store/auth.store";
import { Loader2 } from "lucide-react";
import NotFound from "./pages/NotFound";
import { settingsService } from "./services/settings.service";
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "./components/ui/alert-dialog";

const LoginPage = lazy(() => import("./features/auth/LoginPage"));
const DashboardPage = lazy(() => import("./features/dashboard/DashboardPage"));
const MasterBahanPage = lazy(() => import("./features/master/MasterBahanPage"));
const MasterUkuranPage = lazy(() => import("./features/master/MasterUkuranPage"));
const MasterMataAyamPage = lazy(() => import("./features/master/MasterMataAyamPage"));
const MasterBannerPage = lazy(() => import("./features/master/MasterBannerPage"));
const MasterTokoPage = lazy(() => import("./features/master/MasterTokoPage"));
const MasterUserPage = lazy(() => import("./features/master/MasterUserPage"));
const HakAksesPage = lazy(() => import("./features/master/HakAksesPage"));
const TransaksiPage = lazy(() => import("./features/transaksi/TransaksiPage"));
const TransaksiBaruPage = lazy(() => import("./features/transaksi/TransaksiBaruPage"));
const KasPage = lazy(() => import("./features/kas/KasPage"));
const WhatsAppSettingPage = lazy(() => import("./features/whatsapp/WhatsAppSettingPage"));
const AutoReplyPage = lazy(() => import("./features/whatsapp/AutoReplyPage"));
const LaporanPage = lazy(() => import("./features/laporan/LaporanPage"));
const LaporanManagerialBahanPage = lazy(() => import("./features/laporan/LaporanManagerialBahanPage"));
const LaporanTransaksiPenjualanPage = lazy(() => import("./features/laporan/LaporanTransaksiPenjualanPage"));
const PengaturanPage = lazy(() => import("./features/settings/PengaturanPage"));

const queryClient = new QueryClient();

const Fallback = () => (
  <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
);

const parseJwtExp = (token: string): number | null => {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
    const payload = JSON.parse(atob(padded)) as { exp?: number };
    return typeof payload.exp === 'number' ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
};

const App = () => {
  const hydrate = useAuthStore((s) => s.hydrate);
  const user = useAuthStore((s) => s.user);
  const [settingsChangedOpen, setSettingsChangedOpen] = useState(false);
  const initialLoadedRef = useRef(false);
  const lastUpdatedRef = useRef<string | null>(null);
  useEffect(() => { hydrate(); }, [hydrate]);

  useEffect(() => {
    const token = localStorage.getItem('printflow_token') || sessionStorage.getItem('printflow_token');
    if (!token) return;
    const expMs = parseJwtExp(token);
    if (!expMs) return;

    const logoutNow = () => {
      localStorage.removeItem('printflow_token');
      localStorage.removeItem('printflow_user');
      sessionStorage.removeItem('printflow_token');
      sessionStorage.removeItem('printflow_user');
      window.location.replace('/login');
    };

    const diff = expMs - Date.now();
    if (diff <= 0) {
      logoutNow();
      return;
    }

    const id = window.setTimeout(logoutNow, diff);
    return () => window.clearTimeout(id);
  }, [user?.id]);

  useEffect(() => {
    const token = localStorage.getItem('printflow_token') || sessionStorage.getItem('printflow_token');
    if (!token) return;
    const baseUrl = import.meta.env.VITE_API_BASE_URL || '/api/v1';
    const streamUrl = `${baseUrl.replace(/\/$/, '')}/settings/order-policy/stream`;

    const check = async () => {
      try {
        const policy = await settingsService.getOrderPolicyPublic();
        const version = policy.updated_date ?? null;
        if (!initialLoadedRef.current) {
          initialLoadedRef.current = true;
          lastUpdatedRef.current = version;
          return;
        }
        if (version && lastUpdatedRef.current && version !== lastUpdatedRef.current) {
          setSettingsChangedOpen(true);
        }
      } catch {
        // ignore checker errors
      }
    };

    void check();
    const stream = new EventSource(streamUrl);
    stream.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data) as { updated_date?: string };
        const version = payload.updated_date ?? null;
        const prev = lastUpdatedRef.current;
        if (version) lastUpdatedRef.current = version;
        if (version && prev && version !== prev) {
          setSettingsChangedOpen(true);
        }
      } catch {
        // ignore malformed event payload
      }
    };

    const fallbackId = window.setInterval(() => { void check(); }, 60000);
    return () => {
      window.clearInterval(fallbackId);
      stream.close();
    };
  }, [user?.id]);

  useEffect(() => {
    const onPolicyUpdated = () => setSettingsChangedOpen(true);
    window.addEventListener('order-policy-updated', onPolicyUpdated);
    return () => window.removeEventListener('order-policy-updated', onPolicyUpdated);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <AlertDialog open={settingsChangedOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Perubahan Sistem Terdeteksi</AlertDialogTitle>
              <AlertDialogDescription>
                Telah terjadi perubahan pada sistem. Klik OK untuk memuat ulang dan menerapkan pengaturan terbaru.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogAction onClick={() => window.location.reload()}>OK</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <BrowserRouter>
          <Suspense fallback={<Fallback />}>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/master/bahan" element={<ProtectedRoute permission="materials:read"><MasterBahanPage /></ProtectedRoute>} />
                <Route path="/master/ukuran" element={<ProtectedRoute permission="sizes:read"><MasterUkuranPage /></ProtectedRoute>} />
                <Route path="/master/mata-ayam" element={<ProtectedRoute permission="eyelets:read"><MasterMataAyamPage /></ProtectedRoute>} />
                <Route path="/master/banner" element={<ProtectedRoute permission="banners:read"><MasterBannerPage /></ProtectedRoute>} />
                <Route path="/master/toko" element={<ProtectedRoute permission="stores:read"><MasterTokoPage /></ProtectedRoute>} />
                <Route path="/master/user" element={<ProtectedRoute permission="users:read"><MasterUserPage /></ProtectedRoute>} />
                <Route path="/master/hak-akses" element={<ProtectedRoute permission="roles:read"><HakAksesPage /></ProtectedRoute>} />
                <Route path="/transaksi" element={<Navigate to="/transaksi/daftar" replace />} />
                <Route path="/transaksi/daftar" element={<ProtectedRoute permission="orders:read"><TransaksiPage /></ProtectedRoute>} />
                <Route path="/transaksi/penjualan" element={<ProtectedRoute permission="orders:read"><TransaksiBaruPage /></ProtectedRoute>} />
                <Route path="/kas" element={<ProtectedRoute permission="cash:read"><KasPage /></ProtectedRoute>} />
                <Route path="/whatsapp/setting" element={<ProtectedRoute permission="whatsapp:send"><WhatsAppSettingPage /></ProtectedRoute>} />
                <Route path="/whatsapp/auto-reply" element={<ProtectedRoute permission="whatsapp:auto-reply"><AutoReplyPage /></ProtectedRoute>} />
                <Route path="/laporan/keuangan" element={<ProtectedRoute permission="menu:laporan:keuangan"><LaporanPage /></ProtectedRoute>} />
                <Route path="/laporan/managerial-bahan" element={<ProtectedRoute permission="menu:laporan:managerial"><LaporanManagerialBahanPage /></ProtectedRoute>} />
                <Route path="/laporan/transaksi-penjualan" element={<ProtectedRoute permission="menu:laporan:transaksi-penjualan"><LaporanTransaksiPenjualanPage /></ProtectedRoute>} />
                <Route path="/pengaturan" element={<ProtectedRoute permission="settings:read"><PengaturanPage /></ProtectedRoute>} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
