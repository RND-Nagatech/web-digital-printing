# Responsive Audit - 2026-04-29

Dokumen ini mencatat hasil pengecekan responsive untuk seluruh menu aktif di FE Admin dan FE Order.

## Viewport Uji

- Mobile kecil: 360px
- Tablet: 768px
- Desktop: 1024px
- Large desktop: 1440px

## Hasil Audit FE Admin

- Dashboard: OK
- Master Bahan: OK
- Master Mata Ayam: OK
- Master Banner: OK
- Master User: OK
- Hak Akses User: OK
- Transaksi: OK (toolbar filter + tombol sudah stack di mobile)
- Transaksi Baru: OK (header & tombol kembali sudah adaptif)
- Kas: OK (toolbar + form dialog sudah adaptif)
- Setting WhatsApp: OK
- Auto Reply WhatsApp: OK
- Laporan: OK

## Hasil Audit FE Order

- Halaman Order Banner Online (`/`): OK
- Semua section form (bahan, ukuran, opsi, upload, catatan, pembayaran): OK
- Ringkasan order sticky desktop, normal flow mobile: OK

## Fix yang Diterapkan pada Audit Ini

- Tambah overlay backdrop saat sidebar mobile terbuka agar UX navigasi lebih aman.
- Perbaiki toolbar `Transaksi` dan `Kas` supaya tidak overflow di layar kecil.
- Perbaiki header `Transaksi Baru` supaya stack rapi di mobile.
- Perbaiki grid form di dialog `Kas` agar 1 kolom di mobile dan 2 kolom di `sm+`.

## Aturan Wajib Lanjutan untuk Agent

1. Setiap fitur UI baru wajib lolos 4 viewport uji di atas.
2. Dilarang pakai layout fixed width untuk area konten utama.
3. Toolbar action wajib `flex-col` (mobile) lalu naik ke `sm:flex-row`.
4. Semua tabel wajib dibungkus `overflow-x-auto`.
5. Setiap PR UI wajib update dokumen ini jika ada menu baru atau perubahan layout mayor.

## Referensi

- `fe-admin/docs/responsive-rules.md`
- `fe-admin/docs/master-bahan-style-guide.md`
