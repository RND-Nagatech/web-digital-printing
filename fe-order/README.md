# Frontend Order (Customer) - Aplikasi Digital Printing

Frontend ini adalah aplikasi customer untuk:

- registrasi/login customer,
- membuat pesanan banner,
- menyimpan ke keranjang,
- checkout,
- memantau status pesanan dan pembayaran secara realtime.

## 1. Teknologi yang Digunakan

- Framework UI: React 18 + TypeScript
- Build tool: Vite
- Styling: Tailwind CSS + design token HSL
- UI primitives: Radix UI + komponen shadcn-style
- State management: Zustand
- Data fetching/cache: TanStack Query
- Form: React Hook Form + Zod
- HTTP client: Axios
- Utility dokumen: jsPDF (nota)

## 2. Prasyarat

- Node.js versi 18+ (disarankan 20+)
- npm 9+
- Backend API aktif

## 3. Instalasi

```bash
npm install
```

## 4. Konfigurasi Environment

Buat file `.env` di folder `fe-order/`.

```env
# dipakai Vite proxy
VITE_BACKEND_URL=http://localhost:3000

# opsional, default sudah /api/v1
VITE_API_BASE_URL=/api/v1
```

Penjelasan:

- `VITE_BACKEND_URL`: target proxy untuk route `/api` dan `/uploads`
- `VITE_API_BASE_URL`: base URL axios (default `/api/v1`)

## 5. Menjalankan Aplikasi

```bash
# dev
npm run dev

# build
npm run build

# preview
npm run preview
```

Default dev server saat ini: `http://localhost:8080`.

Jika bentrok port, jalankan:

```bash
npm run dev -- --port 8081
```

## 6. Script yang Tersedia

```bash
npm run dev
npm run build
npm run build:dev
npm run preview
npm run lint
npm run test
npm run test:watch
```

## 7. Fitur Utama

- Auth customer (register/login)
- Form order banner multi-item
- Upload file desain & bukti transfer
- Keranjang pesanan (server-side cart)
- Sinkronisasi harga bahan terbaru otomatis
- Riwayat/tracking pesanan customer
- Polling realtime untuk status order/pembayaran

## 8. Arsitektur Ringkas

- `src/features/order`: flow pemesanan
- `src/pages/MyOrders.tsx`: halaman keranjang
- `src/pages/OrderHistory.tsx`: halaman status/riwayat pesanan
- `src/services`: layer komunikasi API
- `src/store`: state lokal order/auth
- `src/layouts/MainLayout.tsx`: shell aplikasi customer

## 9. Sistem Warna (Order)

Sumber token warna: `src/index.css`.

### 9.1 Token Kunci

- `--primary: 191 91% 36%` (teal/cyan utama)
- `--primary-glow: 192 82% 31%`
- `--accent: 189 94% 43%`
- `--secondary: 220 30% 96%`
- `--success: 142 71% 45%`
- `--warning: 38 92% 50%`
- `--destructive: 0 84% 60%`
- `--background: 220 30% 98%`

### 9.2 Filosofi Warna

- Primary teal/cyan: merepresentasikan kepercayaan, ketelitian, dan nuansa teknologi yang bersih.
- Accent cyan terang: memberi penekanan aksi (CTA) agar konversi order lebih jelas.
- Secondary lembut: menjaga area form tetap nyaman dibaca dan tidak cepat melelahkan.
- Success/warning/destructive: membantu customer memahami status pembayaran/pesanan secara instan.
- Latar terang: mendukung pengalaman mobile-first dan keterbacaan tinggi.

## 10. Alur Penggunaan

1. Customer register/login.
2. Pilih bahan, ukuran, opsi tambahan, upload file.
3. Simpan ke keranjang atau langsung checkout.
4. Pantau status di halaman riwayat pesanan.
5. Status dan pembayaran akan update otomatis (polling realtime).

## 11. Troubleshooting

- API tidak terhubung: cek `VITE_BACKEND_URL` dan backend aktif.
- Gambar upload tidak tampil: cek proxy `/uploads` dan URL file dari backend.
- Data tidak update: pastikan token customer valid dan endpoint `/orders/my`/`/carts/my` tidak error.

## 12. Ringkasan

Frontend order dirancang untuk customer experience yang cepat, jelas, dan realtime dari proses pesan sampai tracking status order selesai.
