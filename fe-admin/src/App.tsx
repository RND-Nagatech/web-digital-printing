import { lazy, Suspense, useEffect } from "react";
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

const LoginPage = lazy(() => import("./features/auth/LoginPage"));
const DashboardPage = lazy(() => import("./features/dashboard/DashboardPage"));
const MasterBahanPage = lazy(() => import("./features/master/MasterBahanPage"));
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

const queryClient = new QueryClient();

const Fallback = () => (
  <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
);

const App = () => {
  const hydrate = useAuthStore((s) => s.hydrate);
  useEffect(() => { hydrate(); }, [hydrate]);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Suspense fallback={<Fallback />}>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/master/bahan" element={<ProtectedRoute permission="materials:read"><MasterBahanPage /></ProtectedRoute>} />
                <Route path="/master/mata-ayam" element={<ProtectedRoute permission="eyelets:read"><MasterMataAyamPage /></ProtectedRoute>} />
                <Route path="/master/banner" element={<ProtectedRoute permission="banners:read"><MasterBannerPage /></ProtectedRoute>} />
                <Route path="/master/toko" element={<ProtectedRoute permission="stores:read"><MasterTokoPage /></ProtectedRoute>} />
                <Route path="/master/user" element={<ProtectedRoute permission="users:read"><MasterUserPage /></ProtectedRoute>} />
                <Route path="/master/hak-akses" element={<ProtectedRoute permission="roles:read"><HakAksesPage /></ProtectedRoute>} />
                <Route path="/transaksi" element={<ProtectedRoute permission="orders:read"><TransaksiPage /></ProtectedRoute>} />
                <Route path="/transaksi/baru" element={<ProtectedRoute permission="orders:read"><TransaksiBaruPage /></ProtectedRoute>} />
                <Route path="/kas" element={<ProtectedRoute permission="cash:read"><KasPage /></ProtectedRoute>} />
                <Route path="/whatsapp/setting" element={<ProtectedRoute permission="whatsapp:send"><WhatsAppSettingPage /></ProtectedRoute>} />
                <Route path="/whatsapp/auto-reply" element={<ProtectedRoute permission="whatsapp:auto-reply"><AutoReplyPage /></ProtectedRoute>} />
                <Route path="/laporan/keuangan" element={<ProtectedRoute permission="menu:laporan:keuangan"><LaporanPage /></ProtectedRoute>} />
                <Route path="/laporan/managerial-bahan" element={<ProtectedRoute permission="menu:laporan:managerial"><LaporanManagerialBahanPage /></ProtectedRoute>} />
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
