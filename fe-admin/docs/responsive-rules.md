# Responsive Rules (Wajib) - FE Admin & FE Order

Dokumen ini adalah aturan wajib untuk semua perubahan UI berikutnya agar seluruh menu tetap responsive di mobile, tablet, dan desktop.

## Scope

Berlaku untuk seluruh halaman di:

- `fe-admin/src/features/**`
- `fe-admin/src/layouts/**`
- `fe-order/src/features/**`
- `fe-order/src/layouts/**`
- komponen shared lintas menu

## Prinsip Utama

1. Mobile-first (default class = mobile).
2. Naikkan layout bertahap lewat breakpoint (`sm`, `md`, `lg`, `xl`).
3. Hindari fixed width untuk konten utama.
4. Tabel harus aman di layar kecil (`overflow-x-auto`).
5. Action penting (search, filter, tambah, pagination) tetap bisa dipakai di mobile.

## Breakpoint Standard

- `sm`: >= 640px
- `md`: >= 768px
- `lg`: >= 1024px
- `xl`: >= 1280px

Gunakan hanya saat dibutuhkan, jangan over-breakpoint.

## Rules Layout

### 1) Main Container

- Gunakan wrapper layout dari `AppLayout`.
- Konten halaman wajib pakai:
  - `space-y-*` untuk vertical rhythm.
  - `w-full` dan hindari hardcoded width besar.

### 2) Section Header / Toolbar

- Toolbar wajib support mobile stack:
  - default: `flex-col`
  - `sm:` baru jadi `flex-row`
- Search input: `w-full` di mobile, `sm:max-w-*` di tablet+.
- Tombol tambah jangan hilang di mobile, tetap terlihat tanpa hover dependency.

### 3) Grid Content

- Gunakan pattern:
  - mobile: `grid-cols-1` (implicit)
  - tablet: `sm:grid-cols-2`
  - desktop: `lg:grid-cols-3` / `lg:grid-cols-4`
- Jangan langsung `grid-cols-3` tanpa fallback mobile.

### 4) Table

Wajib:

- Wrapper table 2 layer:
  - outer: `overflow-hidden rounded-md border`
  - inner: `overflow-x-auto`
- Table container: `rounded-md border`
- Table gunakan `min-w-[...]` per kebutuhan kolom agar struktur tidak pecah
- Header/row spacing tetap terbaca di mobile
- Jangan memaksa semua kolom muat tanpa scroll
- Footer (total, pagination) harus di luar `overflow-x-auto` agar tidak ikut geser

### 5) Dialog / Modal

- Gunakan `DialogContent` dengan `sm:max-w-*`.
- Form dalam dialog harus pakai grid responsive:
  - default 1 kolom
  - `sm:grid-cols-2` bila perlu

### 6) Pagination

- Footer pagination wajib wrap di mobile:
  - `flex-col` default
  - `sm:flex-row` untuk layar lebih besar
- Tombol `<< < > >>` harus tetap tap-friendly (`h-10 w-10` minimal).

## Rules Komponen Input

- Input focus harus single-border (tidak double outline/ring).
- Jangan gunakan native `<select>` untuk filter/pagination jika sudah ada komponen `Select` custom.

## Accessibility Minimum

- Semua tombol icon-only wajib punya konteks jelas (`title` atau label area).
- Kontras teks vs background tidak boleh terlalu rendah.
- State disabled harus jelas secara visual.

## QA Checklist (Wajib Sebelum Merge)

Setiap perubahan UI harus dicek minimal pada lebar:

- 360px (mobile kecil)
- 768px (tablet)
- 1024px (desktop)
- 1440px (large desktop)

Checklist:

- [ ] Tidak ada elemen penting yang terpotong
- [ ] Tidak ada horizontal overflow global (kecuali area table)
- [ ] Toolbar tetap usable di mobile
- [ ] Dialog/form tetap bisa diisi penuh di mobile
- [ ] Pagination/filter tetap berfungsi di semua ukuran
- [ ] Empty state tetap center dan proporsional

## Pattern Referensi

Untuk style + responsive pattern master data, ikuti:

- `docs/master-bahan-style-guide.md`
- `src/features/master/MasterBahanPage.tsx`
- `fe-order/src/features/order/OrderPage.tsx`

## Aturan untuk Agent Lain

Sebelum menambah fitur/menu baru:

1. Copy pattern dari `MasterBahanPage`.
2. Terapkan rules di dokumen ini.
3. Lakukan QA 4 viewport wajib.
4. Jangan merge jika masih ada overflow atau toolbar tidak usable di mobile.
