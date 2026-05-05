# Master Bahan Style Guide

Dokumen ini menjelaskan pattern UI/UX pada halaman **Master Bahan** agar menu lain bisa mengikuti style yang sama secara konsisten.

## Tujuan

- Menyamakan tampilan table-management page (master data) di admin.
- Menjaga konsistensi visual antar menu.
- Menjadi referensi cepat untuk agent/developer saat membuat halaman baru.

## File Referensi Utama

- `src/features/master/MasterBahanPage.tsx`
- `src/components/common/EmptyState.tsx`
- `src/components/ui/select.tsx`
- `src/components/ui/input.tsx`
- `src/services/master.service.ts`
- `src/types/dto/materials.dto.ts`

## Struktur Layout Halaman

Gunakan struktur berikut (urutan wajib):

1. **Container utama**: `Card` dengan border + shadow
2. **Header bar gelap**: judul menu (sesuai sidebar)
3. **Toolbar**: search (kiri) + tombol tambah (kanan)
4. **Table box**: table data dalam border rounded
5. **Info total data**
6. **Footer pagination**: info range data + controls

## Aturan Visual

### 1) Header Panel

- Gunakan:
  - `CardHeader className="rounded-none bg-slate-800 px-6 py-4"`
  - `CardTitle className="text-xl font-semibold text-white"`
- Judul harus sama persis dengan nama menu sidebar.

### 2) Toolbar

- Wrapper:
  - `border-b bg-muted/40 px-6 py-5`
- Search input:
  - pakai icon `Search` di kiri
  - input class minimal: `h-11 bg-white pl-10`
- Tombol tambah:
  - class: `h-11 px-6 gradient-primary text-primary-foreground shadow-glow hover:opacity-95`
  - icon `Plus`

### 3) Table

- Bungkus table dengan:
  - `overflow-x-auto rounded-md border`
- Header row:
  - `thead className="bg-muted/40"`
  - `tr className="text-left text-base font-semibold text-foreground"`
- Row:
  - `className="border-t hover:bg-muted/30"`

### 4) Status Badge

- Aktif:
  - `bg-success/10 text-success`
- Nonaktif:
  - `bg-muted text-muted-foreground`

### 5) Empty State

- Wajib pakai komponen `EmptyState`.
- Empty illustration otomatis dari `src/assets/empty.svg`.
- Ukuran ilustrasi: `h-64 w-64` (sudah di component).

## Pagination Pattern (Wajib)

Pagination harus **server-side** untuk data list besar.

### API Contract (materials)

Request:

- `GET /api/v1/materials?page=<number>&limit=<number>&search=<string>`

Response:

```json
{
  "success": true,
  "message": "Success",
  "data": {
    "items": [],
    "meta": {
      "page": 1,
      "limit": 10,
      "total": 0,
      "totalPages": 1
    }
  }
}
```

### UI Controls

- Dropdown per halaman: `10`, `20`, `50` (gunakan custom `Select`, jangan native select).
- Tombol:
  - `<<` ke halaman pertama
  - `<` prev page
  - `>` next page
  - `>>` ke halaman terakhir
- Badge halaman aktif: box gelap (`bg-slate-800 text-white`).

### Footer Info

Tampilkan format:

- `Menampilkan {fromItem}-{toItem} dari {total} data`

## Behavior Rules

- Saat `search` berubah:
  - reset `page` ke `1`.
- Saat `limit` berubah:
  - reset `page` ke `1`.
- Tombol pagination disable sesuai boundary:
  - first/prev disable di page 1
  - next/last disable di page terakhir

## Form Modal (Tambah/Edit)

- Tetap gunakan `Dialog` existing.
- Tombol submit gunakan style primary:
  - `gradient-primary text-primary-foreground`

## Checklist Replikasi ke Menu Lain

Saat membuat halaman baru (mis. Master Mata Ayam, Master User), cek ini:

- [ ] Header panel gelap dengan judul sesuai menu
- [ ] Toolbar search + tombol tambah
- [ ] Table dalam box border rounded
- [ ] Empty state pakai ilustrasi `empty.svg`
- [ ] Footer total data
- [ ] Pagination server-side + `Select` 10/20/50
- [ ] Tombol `<< < > >>` dengan disable state benar
- [ ] Input focus single-border (tidak double outline)

## Catatan Implementasi

- Jangan gunakan `select` native HTML untuk limit pagination.
- Gunakan komponen `Select` dari `src/components/ui/select.tsx`.
- Untuk endpoint list lain, ikuti pola DTO paged response:
  - `items`
  - `meta`

