# Frontend Admin - Aplikasi Digital Printing

Frontend admin digunakan untuk operasional internal: master data, transaksi, kas, WhatsApp, laporan keuangan, dan laporan managerial bahan.

## 1. Teknologi yang Digunakan

- Framework UI: React 18 + TypeScript
- Build tool: Vite
- Styling: Tailwind CSS + design token HSL
- UI primitives: Radix UI + komponen shadcn-style
- State management: Zustand
- Data fetching/cache: TanStack Query
- Form: React Hook Form + Zod
- HTTP client: Axios
- Chart: Recharts
- Export laporan:
	- PDF: jsPDF + jspdf-autotable
	- Excel: exceljs (dengan worker untuk performa)

## 2. Prasyarat

- Node.js versi 18+ (disarankan 20+)
- npm 9+
- Backend API aktif

## 3. Instalasi

```bash
npm install
```

## 4. Konfigurasi Environment

Buat file `.env` di folder `fe-admin/`.

```env
# dipakai Vite proxy
VITE_BACKEND_URL=http://localhost:3000

# opsional, default sudah /api/v1
VITE_API_BASE_URL=/api/v1
```

Penjelasan:

- `VITE_BACKEND_URL`: target proxy Vite untuk `/api` dan `/uploads`
- `VITE_API_BASE_URL`: base URL axios (default `/api/v1`)

## 5. Menjalankan Aplikasi

```bash
# dev
npm run dev

# build
npm run build

# preview build
npm run preview
```

Default dev server saat ini: `http://localhost:8080`.

Jika bentrok port dengan frontend lain, jalankan:

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

- Login admin/owner/kasir
- Hak akses berbasis role & permission granular
- Master data: bahan, mata ayam, banner, toko, user, role
- Transaksi order admin
- Modul kas
- Integrasi WhatsApp (status, auto-reply)
- Laporan:
	- Laporan keuangan
	- Laporan managerial bahan
	- Export PDF/Excel

## 8. Arsitektur Ringkas

- `src/services`: layer API per modul
- `src/store`: auth dan UI state global
- `src/features`: halaman berbasis domain
- `src/layouts`: app shell (sidebar, topbar)
- `src/components/ui`: komponen UI reusable

## 9. Sistem Warna (Admin)

Sumber token warna: `src/index.css`.

### 9.1 Token Kunci

- `--primary: 191 91% 36%` (teal/cyan utama)
- `--primary-glow: 192 82% 31%`
- `--accent: 189 94% 43%`
- `--secondary: 215 25% 27%` (slate)
- `--success: 142 71% 45%`
- `--warning: 38 92% 50%`
- `--destructive: 0 84% 60%`
- `--background: 210 20% 98%`

### 9.2 Filosofi Warna

- Primary (teal/cyan): menekankan rasa presisi, modern, dan kepercayaan pada sistem operasional.
- Accent (cyan terang): dipakai untuk aksi penting agar cepat terlihat tanpa terlalu agresif.
- Secondary (slate): memberi kesan profesional dan stabil untuk dashboard/data-heavy.
- Success/Warning/Destructive: mempertahankan semantik universal untuk feedback status.
- Background terang netral: menjaga keterbacaan tinggi saat bekerja lama di panel admin.

## 10. Catatan Penggunaan

- Pastikan backend aktif sebelum membuka halaman admin.
- Untuk role non-owner, visibilitas menu mengikuti permission backend.
- Jika sesi habis (`401`), token dibersihkan otomatis dan user perlu login ulang.

## 11. Troubleshooting

- Tidak bisa akses API: cek `VITE_BACKEND_URL` dan backend port.
- CORS error: pastikan backend `CORS_ORIGIN` mencakup origin admin.
- Export terasa berat: pastikan browser tidak memblokir worker/script.

## 12. Ringkasan

Frontend admin ini dioptimalkan untuk operasional harian digital printing dengan fokus:

- kontrol akses yang jelas,
- pengelolaan data yang cepat,
- laporan yang dapat diekspor,
- dan visual yang konsisten serta mudah dibaca.
