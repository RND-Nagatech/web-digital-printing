import axios, { AxiosInstance } from 'axios';

const baseURL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

export const api: AxiosInstance = axios.create({
  baseURL,
  timeout: 20000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  // Attach token if present (future-proof)
  const token = typeof window !== 'undefined'
    ? (localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token'))
    : null;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    // Centralized error normalization
    const message =
      error?.response?.data?.message ??
      error?.message ??
      'Terjadi kesalahan jaringan';
    return Promise.reject(new Error(message));
  },
);

export const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));
