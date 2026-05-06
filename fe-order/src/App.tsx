import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppRoutes } from "@/routes/AppRoutes";
import { useEffect, useRef, useState } from "react";
import { OrderService } from "@/services/order.service";
import { useAuthStore } from "@/store/authStore";
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
});

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
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [settingsChangedOpen, setSettingsChangedOpen] = useState(false);
  const initialLoadedRef = useRef(false);
  const lastUpdatedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) return;
    const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
    if (!token) return;
    const expMs = parseJwtExp(token);
    if (!expMs) return;

    const logoutNow = () => {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('customer-auth-user');
      sessionStorage.removeItem('auth_token');
      sessionStorage.removeItem('customer-auth-user');
      window.location.replace('/login');
    };

    const diff = expMs - Date.now();
    if (diff <= 0) {
      logoutNow();
      return;
    }

    const id = window.setTimeout(logoutNow, diff);
    return () => window.clearTimeout(id);
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) {
      initialLoadedRef.current = false;
      lastUpdatedRef.current = null;
      return;
    }
    const baseUrl = import.meta.env.VITE_API_BASE_URL || '/api/v1';
    const streamUrl = `${baseUrl.replace(/\/$/, '')}/settings/order-policy/stream`;

    const check = async () => {
      try {
        const policy = await OrderService.getOrderPolicy();
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
    stream.onopen = () => {
      // Sinkronisasi cepat setelah koneksi SSE aktif/reconnect
      void check();
    };
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
    stream.onerror = () => {
      // Jika SSE bermasalah, fallback checker tetap cepat menangkap perubahan.
      void check();
    };

    const fallbackId = window.setInterval(() => { void check(); }, 5000);
    return () => {
      window.clearInterval(fallbackId);
      stream.close();
    };
  }, [isAuthenticated]);

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
          <AppRoutes />
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
