# Backend API - Aplikasi Digital Printing

Backend ini dibangun menggunakan NestJS + MongoDB untuk melayani:

- autentikasi admin dan customer,
- manajemen master data (bahan, mata ayam, banner, user, role, toko),
- transaksi order dan keranjang,
- kas dan laporan,
- integrasi WhatsApp,
- upload file desain dan bukti pembayaran.

## 1. Teknologi yang Digunakan

- Runtime: Node.js
- Framework: NestJS 11
- Bahasa: TypeScript
- Database: MongoDB + Mongoose
- Auth: JWT + Passport
- Validasi: class-validator, class-transformer
- Upload: multer
- Security/limit: @nestjs/throttler
- Integrasi WA: Baileys

## 2. Struktur Modul Utama

- `auth`: login admin/customer, bootstrap role default
- `users`: CRUD user admin
- `roles`: CRUD hak akses role
- `customers`: registrasi dan data customer
- `materials`: master bahan
- `eyelets`: master mata ayam
- `banners`: master banner + gambar
- `stores`: master profil toko
- `orders`: transaksi pesanan
- `carts`: keranjang customer
- `cash` + `cash-daily`: pencatatan kas
- `reports`: laporan keuangan + managerial bahan
- `whatsapp`: status, kirim pesan, auto-reply

## 3. Prasyarat

- Node.js versi 18+ (disarankan 20+)
- npm 9+
- MongoDB aktif (lokal/remote)

## 4. Instalasi

```bash
npm install
```

## 5. Konfigurasi Environment

Buat file `.env` di folder `backend/`.

Contoh minimal:

```env
PORT=3000
MONGODB_URI=mongodb://127.0.0.1:27017/digital_printing
JWT_SECRET=super_rahasia
JWT_EXPIRES_IN=1d
BCRYPT_ROUNDS=10
UPLOAD_MAX_SIZE=52428800
CORS_ORIGIN=http://localhost:8080,http://localhost:8081

WHATSAPP_ENABLED=false
WHATSAPP_ADMIN_NUMBER=

OWNER_USERNAME=owner
OWNER_EMAIL=owner@printflow.local
OWNER_PASSWORD=owner123

ADMIN_USERNAME=admin
ADMIN_EMAIL=admin@printflow.local
ADMIN_PASSWORD=admin123
```

Catatan:

- API prefix global: `/api/v1`
- Static file upload di-serve dari: `/uploads`

## 6. Menjalankan Aplikasi

```bash
# development (watch)
npm run start:dev

# production build
npm run build
npm run start:prod
```

Secara default backend berjalan di `http://localhost:3000`.

## 7. Script yang Tersedia

```bash
npm run build
npm run start
npm run start:dev
npm run start:debug
npm run start:prod
npm run lint
npm run test
npm run test:watch
npm run test:cov
npm run test:e2e
```

## 8. Ringkasan Endpoint Penting

Semua endpoint diawali `/api/v1`.

- Auth
  - `POST /auth/login`
  - `GET /auth/me`
  - `POST /auth/customer/register`
  - `POST /auth/customer/login`
- Master
  - `/users`, `/roles`, `/materials`, `/eyelets`, `/banners`, `/stores`
- Order & Cart
  - `GET /orders/my`
  - `POST /orders`
  - `GET /carts/my`
  - `POST /carts`
  - `PATCH /carts/:id`
  - `POST /carts/checkout`
- Keuangan & Laporan
  - `/cash`
  - `/reports/finance/report`
  - `/reports/materials/top`
- WhatsApp
  - `/whatsapp/status`
  - `/whatsapp/connect`
  - `/whatsapp/auto-reply`

## 9. Alur Penggunaan Singkat

1. Jalankan backend + frontend.
2. Login admin/owner untuk kelola master data.
3. Customer register/login via frontend order.
4. Customer membuat pesanan (order) atau simpan dulu ke keranjang.
5. Admin memproses status order dan pembayaran.
6. Laporan keuangan/managerial ditarik dari modul reports.

## 10. Catatan Pengembangan

- Guard permission digunakan untuk endpoint admin (`PermissionsGuard`).
- Endpoint customer seperti `/orders/my` dan `/carts/*` bergantung pada token actor `customer`.
- `carts/my` saat ini sudah mendukung sinkronisasi harga bahan terbaru.

## 11. Troubleshooting Umum

- `EADDRINUSE`: port 3000 sedang dipakai proses lain.
- `MONGODB_URI` salah: aplikasi gagal startup saat koneksi DB.
- `401 Unauthorized`: token expired/tidak valid.
- File upload gagal: cek `UPLOAD_MAX_SIZE` dan tipe file yang diizinkan.

## 12. Lisensi

Project internal (private workspace).
