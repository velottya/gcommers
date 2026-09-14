# Gcommers Admin Console

Aplikasi web internal untuk mengelola operasional bisnis Gcommers: produk, harga,
pesanan (order), pengiriman, gudang, kuota subsidi, dan tagihan mitra transportir.

Aplikasi ini **hanya untuk tim internal (admin)**. Pengguna akhir (kios/pembeli
dan sopir/transportir di lapangan) menggunakan aplikasi mobile **Flutter**
terpisah, yang tidak ada di repo ini. Kedua aplikasi berbagi **satu database
yang sama** — perubahan yang dilakukan lewat console ini bisa langsung terlihat
di aplikasi Flutter, dan sebaliknya.

---

## 1. Untuk pembaca awam: apa aplikasi ini sebenarnya?

Bayangkan Gcommers seperti toko sembako/gas besar yang melayani banyak daerah.
Ada tiga jenis "petugas kantor" yang memakai aplikasi ini, masing-masing dengan
tanggung jawab berbeda:

| Peran (Role)          | Ibaratnya siapa?                              | Yang dikerjakan di aplikasi ini |
|------------------------|------------------------------------------------|----------------------------------|
| **SuperAdmin**         | Kantor pusat                                    | Mengatur semuanya: produk, harga master, semua region, semua mitra transportir, menyetujui pengajuan, melihat semua pesanan |
| **AdminRegion**        | Kantor cabang di suatu wilayah/region           | Mengatur harga & stok produk di wilayahnya, mengajukan kuota subsidi, mengajukan gudang, mengajukan SO (Sales Order) ke pusat |
| **AdminTransport**     | Kantor pengelola armada pengiriman (mitra jasa) | Menugaskan sopir & truk ke pesanan, memantau pengiriman, membuat & mengajukan tagihan pengiriman |

Setiap peran login dengan akun sendiri, dan tampilan menu yang muncul otomatis
menyesuaikan perannya masing-masing — SuperAdmin melihat menu paling lengkap,
sementara AdminRegion dan AdminTransport hanya melihat menu yang relevan
dengan tugas mereka.

Alur besar bisnisnya kurang lebih:
1. Pembeli (lewat aplikasi Flutter) membuat pesanan (**Order**).
2. **AdminRegion** memastikan harga & stok produk untuk wilayahnya sudah benar,
   mengelola kuota subsidi, dan mengajukan Sales Order (SO) ke pusat.
3. **SuperAdmin** menyetujui berbagai pengajuan (harga, kuota, SO, gudang) dan
   mengelola master data (produk, akun admin region/transport).
4. **AdminTransport** menugaskan sopir + truk untuk mengantar pesanan
   (Alokasi Sopir), memantau status pengiriman (muat → jalan → selesai), lalu
   membuat rekap tagihan pengiriman ke pusat untuk disetujui.

---

## 2. Untuk pembaca IT: arsitektur teknis

### Tech stack

- **Backend:** Laravel 12 (PHP 8.2+), session-based auth (bukan token API murni)
- **Frontend:** React 19 SPA (Single Page Application) dengan React Router,
  dibangun dengan Vite + Tailwind CSS v4
- **Database:** Microsoft SQL Server — **database yang sama dipakai bersama**
  aplikasi Flutter (kios & transportir) yang terpisah repo-nya
- **PDF export:** `barryvdh/laravel-dompdf` (surat jalan, BPTP)
- **Auth:** Laravel Sanctum + session, dengan hashing password kompatibel
  Flutter (`App\Helpers\FlutterPasswordHasher`)

### Struktur aplikasi

```
app/
  Console/Commands/SetAdminPassword.php   # perintah artisan untuk set password admin pertama kali
  Helpers/FlutterPasswordHasher.php       # hashing password agar kompatibel dengan sisi Flutter
  Http/
    Controllers/
      Api/          # semua controller REST untuk SPA (prefix /api/admin/*)
      Auth/          # LoginController (halaman login Blade)
    Middleware/
      AuthenticateAdmin.php   # guard session admin
      EnsureAdminRole.php     # validasi & mapping slug role dari URL
  Models/            # Eloquent model, sebagian besar map ke tabel SQL Server yang sudah ada
resources/
  js/
    api/             # wrapper axios/fetch ke endpoint /api/admin/*
    components/
      layout/        # Layout.jsx, Sidebar.jsx (menu per-role), TopBar.jsx
      pages/         # satu file per halaman (Dashboard, OrderList, dst.)
      ui/            # komponen UI reusable
  views/             # Blade: halaman login + shell kosong untuk SPA (admin.blade.php)
routes/
  web.php            # semua route (auth, /api/admin/*, catch-all SPA)
database/
  migrations/        # HANYA tabel admin-only (lihat bagian Database)
  seeders/           # GcommersSeeder untuk data demo
docs/
  admin-role-map.md          # peta awal peran & rencana halaman
  ORDER_FLOW_CONTRACT.md      # WAJIB dibaca sebelum mengubah apa pun terkait Orders/Shipments
```

### Alur request

- Semua route ada di `routes/web.php` (bukan `api.php`), supaya endpoint API
  ikut memakai session + CSRF cookie standar Laravel — bukan token API terpisah.
- `/login` → halaman login Blade biasa.
- Setelah login, browser diarahkan ke `/` → di-serve oleh route catch-all
  (`Route::get('/{any?}', ...)`) yang mengembalikan satu view kosong
  (`resources/views/admin.blade.php`) tempat React SPA dimuat dan mengambil
  alih routing di sisi client (React Router).
- Semua endpoint data ada di bawah prefix `/api/admin/*`, dilindungi middleware
  `auth.admin`.

### Database: database bersama, hati-hati mengubahnya

Ini bagian paling penting untuk siapa pun yang akan menyentuh backend:

- Database SQL Server ini **bukan milik proyek ini sendirian**. Sebagian besar
  tabel inti (`Users`, `Orders`, `Products`, `OrderItems`, `OrderEvents`,
  `Notifications`, `Shipments`, dll.) dibuat dan dipakai juga oleh aplikasi
  Flutter (kios & transportir) di repo terpisah, lewat koneksi database
  langsung — **bukan** lewat REST API console ini.
- **Baca `docs/ORDER_FLOW_CONTRACT.md` sebelum mengubah apa pun** yang
  berhubungan dengan `Orders` atau `Shipments`. Perubahan sepihak pada skema
  atau state machine tabel ini bisa merusak aplikasi Flutter.
- Migration Laravel di `database/migrations/` hanya boleh membuat/mengubah
  **tabel admin-only** (kredensial admin, pengaturan, tabel-tabel workflow
  pengajuan & approval) — lihat daftar di bawah. Console ini **tidak pernah**
  membuat baris `Orders` baru maupun memaksa perpindahan status `Shipments`
  secara langsung; keduanya adalah domain aplikasi Flutter.

**Tabel admin-only utama** (dibuat lewat migration Laravel):

| Tabel | Fungsi |
|---|---|
| `admin_credentials` | password (bcrypt) & info login akun admin, terhubung ke `Users` |
| `settings` | pengaturan tarif (PPN/pengiriman, dsb.) |
| `subsidy_quota_submissions` + turunannya | pengajuan & persetujuan kuota subsidi per region/kecamatan |
| `cost_rate_submissions` + `cost_rate_items` | pengajuan & persetujuan tarif biaya per produk × kecamatan |
| `transport_partner_rates` | tarif referensi mitra transportir |
| `gudang_submissions` (+ pivot `gudang_submission_kecamatans`) | pengajuan gudang oleh AdminRegion, disetujui SuperAdmin, dengan cakupan banyak kecamatan |
| `so_submission_*` | pengajuan Sales Order (SO) oleh AdminRegion ke SuperAdmin |
| `transport_billings` | rekap & pengajuan tagihan pengiriman oleh AdminTransport |
| `order_transport_assignments` | penugasan mitra transportir ke pesanan |
| `user_kecamatans` | wilayah kerja (banyak kecamatan) untuk akun AdminTransport |
| `product_stock_requests` | pengajuan penambahan stok produk oleh AdminRegion |

Tabel `Shipments` (status muat/kirim/selesai) sudah ada sebelumnya di luar
Laravel dan dipakai apa adanya sebagai sumber kebenaran tracking pengiriman.

### Fitur per peran (ringkas)

Menu di sidebar ditentukan otomatis berdasarkan role akun yang login
(`resources/js/components/layout/Sidebar.jsx`):

**SuperAdmin** — akses penuh:
Dashboard, Daftar Pesanan, Produk, Persetujuan Ajuan (approve/reject semua
pengajuan dari region & transportir), Admin Region, Admin Transport, Daftar
Gudang, Daftar User, Notifikasi, Pengaturan (tarif PPN/ongkir).

**AdminRegion** — lingkup wilayah sendiri:
Dashboard, Daftar Pesanan, Produk, Harga Produk, Tarif Transportir, Quota
Subsidi (ajukan), Pengajuan SO, Daftar Gudang (ajukan), Admin Region (kelola
akun sesama admin region), Daftar Kiosk, Notifikasi.

**AdminTransport** — operasional pengiriman:
Dashboard, Alokasi Sopir (menugaskan sopir + truk), Daftar Gudang, Rekap
Tagihan (ajukan tagihan ke pusat), Daftar Sopir, Notifikasi.

Beberapa alur kerja memakai pola **pengajuan → tinjauan → persetujuan**
(draft/submitted/approved/rejected): kuota subsidi, tarif biaya, gudang, SO,
dan tagihan transport — semuanya diajukan oleh AdminRegion/AdminTransport dan
disetujui oleh SuperAdmin lewat halaman "Persetujuan Ajuan".

---

## 3. Setup & menjalankan proyek

### Prasyarat

- PHP 8.2+, Composer
- Node.js (untuk build asset React/Vite)
- Akses ke database SQL Server `db_gcommers` (bukan database baru — ini
  database bersama dengan aplikasi Flutter)

### Instalasi

```bash
composer install
npm install

cp .env.example .env
php artisan key:generate
```

Edit `.env`, set koneksi ke SQL Server (bukan `sqlite` seperti nilai default
di `.env.example`):

```env
DB_CONNECTION=sqlsrv
DB_HOST=<host_sql_server>
DB_PORT=<port>
DB_DATABASE=db_gcommers
DB_USERNAME=<username>
DB_PASSWORD=<password>
```

Jalankan migration (**hanya membuat tabel admin-only** yang belum ada — lihat
peringatan di bagian Database di atas):

```bash
php artisan migrate
```

(Opsional) isi data demo:

```bash
php artisan db:seed --class=GcommersSeeder
```

Buat/atur password login untuk akun admin pertama (akun `Users` harus sudah
ada di database, biasanya dibuat dari sisi Flutter/data existing):

```bash
php artisan admin:set-password {email} {password}
```

### Menjalankan secara lokal

```bash
composer run dev
```

Perintah ini otomatis menjalankan bersamaan: server Laravel (`php artisan
serve`), queue listener, log viewer (`pail`), dan Vite dev server untuk React.

Atau build asset untuk produksi:

```bash
npm run build
```

Lalu akses aplikasi di `/login`.

---

## 4. Dokumen terkait

- [`docs/ORDER_FLOW_CONTRACT.md`](docs/ORDER_FLOW_CONTRACT.md) — kontrak skema
  & aturan main data Order/Shipment antara console ini dan aplikasi Flutter.
  **Wajib dibaca** sebelum menyentuh fitur pesanan/pengiriman.
- [`docs/admin-role-map.md`](docs/admin-role-map.md) — catatan awal
  perancangan peran & halaman (historis, sebagian sudah berkembang lebih jauh
  dari isi dokumen ini).
