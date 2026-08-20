# Mas Firman Pratama — Tenant

Struktur tenant ini dipisahkan dari core JFS AI Platform.

## Target architecture

```text
mas-firman-pratama/
├── app/                 # halaman aplikasi tenant
├── pages/               # halaman publik/detail yang berdiri sendiri
├── assets/
│   ├── brand/           # logo/branding tenant
│   ├── products/        # visual produk
│   └── programs/        # visual program AMC
├── data/                # konfigurasi/data seed tenant
├── services/            # integrasi Supabase/automation
├── styles/              # stylesheet bersama tenant
├── scripts/             # JavaScript bersama tenant
├── legacy/              # kompatibilitas sementara; akan dikurangi
├── index.html           # entry publik
└── demo.html            # URL kompatibilitas lama
```

## Aturan struktur

1. Data bisnis tidak ditaruh di HTML ketika migrasi Supabase selesai.
2. Asset tidak diletakkan bercampur dengan file halaman.
3. Halaman aplikasi masuk `app/` dan halaman publik/detail masuk `pages/`.
4. Integrasi database dan automation masuk `services/`.
5. File lama dipertahankan sementara sampai semua link dan dependensi diverifikasi.
6. `tenant_id` menjadi identitas utama seluruh data tenant.

## Status migrasi

- Fase 1: struktur folder dan manifest tenant dibuat.
- Fase 2: migrasi asset dan halaman secara bertahap.
- Fase 3: pemisahan CSS/JS.
- Fase 4: koneksi Supabase sebagai sumber data utama.
