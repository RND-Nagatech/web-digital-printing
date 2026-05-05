import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import { MainLayout } from '@/layouts/MainLayout';
import NotFound from '@/pages/NotFound';
import { RequireCustomerAuth } from '@/features/auth/RequireCustomerAuth';

const OrderPage = lazy(() => import('@/features/order/OrderPage'));
const LoginPage = lazy(() => import('@/pages/Login'));
const RegisterPage = lazy(() => import('@/pages/Register'));
const MyOrdersPage = lazy(() => import('@/pages/MyOrders'));
const OrderHistoryPage = lazy(() => import('@/pages/OrderHistory'));

const PageFallback = () => (
  <div className="flex min-h-[60vh] items-center justify-center">
    <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
  </div>
);

export const AppRoutes = () => (
  <Routes>
    <Route
      path="/login"
      element={
        <Suspense fallback={<PageFallback />}>
          <LoginPage />
        </Suspense>
      }
    />
    <Route
      path="/register"
      element={
        <MainLayout>
          <Suspense fallback={<PageFallback />}>
            <RegisterPage />
          </Suspense>
        </MainLayout>
      }
    />
    <Route
      path="/"
      element={
        <RequireCustomerAuth>
          <MainLayout>
            <Suspense fallback={<PageFallback />}>
              <OrderPage />
            </Suspense>
          </MainLayout>
        </RequireCustomerAuth>
      }
    />
    <Route
      path="/pesanan"
      element={
        <RequireCustomerAuth>
          <MainLayout>
            <Suspense fallback={<PageFallback />}>
              <MyOrdersPage />
            </Suspense>
          </MainLayout>
        </RequireCustomerAuth>
      }
    />
    <Route
      path="/riwayat-pesanan"
      element={
        <RequireCustomerAuth>
          <MainLayout>
            <Suspense fallback={<PageFallback />}>
              <OrderHistoryPage />
            </Suspense>
          </MainLayout>
        </RequireCustomerAuth>
      }
    />
    <Route path="*" element={<NotFound />} />
  </Routes>
);
