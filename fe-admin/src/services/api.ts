import axios, { AxiosError, AxiosInstance, AxiosRequestConfig } from 'axios';
import { toast } from 'sonner';
import { ApiResponse } from '@/types/api';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

export const api: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('printflow_token') || sessionStorage.getItem('printflow_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ message?: string }>) => {
    const status = error.response?.status;
    const message = error.response?.data?.message || error.message || 'Terjadi kesalahan';

    if (status === 401) {
      localStorage.removeItem('printflow_token');
      localStorage.removeItem('printflow_user');
      sessionStorage.removeItem('printflow_token');
      sessionStorage.removeItem('printflow_user');
      toast.error('Sesi berakhir, silakan login kembali');
    } else if (status && status >= 500) {
      toast.error('Server bermasalah, coba lagi nanti');
    }

    return Promise.reject(new Error(message));
  },
);

export const apiGetData = async <T>(url: string, config?: AxiosRequestConfig): Promise<T> => {
  const res = await api.get<ApiResponse<T>>(url, config);
  return res.data.data;
};

export const apiPostData = async <T, B = unknown>(
  url: string,
  body?: B,
  config?: AxiosRequestConfig,
): Promise<T> => {
  const res = await api.post<ApiResponse<T>>(url, body, config);
  return res.data.data;
};

export const apiPutData = async <T, B = unknown>(
  url: string,
  body?: B,
  config?: AxiosRequestConfig,
): Promise<T> => {
  const res = await api.put<ApiResponse<T>>(url, body, config);
  return res.data.data;
};

export const apiDeleteOk = async (url: string, config?: AxiosRequestConfig): Promise<{ success: true }> => {
  await api.delete(url, config);
  return { success: true };
};
