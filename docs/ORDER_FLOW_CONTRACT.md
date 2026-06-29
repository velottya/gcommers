# Kontrak Sistem Pesanan — Admin Console ⟷ Flutter App

> Dokumen ini ditulis dari sisi **admin console** (Laravel, repo ini) untuk dipakai
> oleh sesi Claude / developer yang mengerjakan **Flutter App** (User Kiosk &
> User Transportir) di repo terpisah. Kedua proyek berjalan bersamaan dan
> **menulis langsung ke database SQL Server yang sama** (`db_gcommers`) —
> tidak ada REST API perantara di antara keduanya. Jadi kontrak yang paling
> penting di sini adalah **kontrak skema tabel**, bukan kontrak HTTP.
>
> Update terakhir: 2026-06-26 — admin console (AdminRegion) sekarang juga
> menulis `Orders.Vendor` (lihat §3.1), dan langkah "Atur Pengiriman" lama
> (truk penuh/parsial sebelum sopir ditugaskan) sudah dihapus dari admin
> console. AdminTransport tetap mengalokasikan sopir+truk lewat halaman
> "Alokasi Sopir" (`Shipments`, tidak berubah) — bagian §3.2 dan state
> machine §5 masih berlaku apa adanya untuk load-in/load-out.

## 1. Aturan emas

1. **Jangan rename / drop kolom yang sudah ada** di tabel `Orders`, `Users`,
   `OrderItems`, `OrderEvents`, `Shipments`, `ShipmentRouteChecks`. Semua
   perubahan dari sisi admin console bersifat *additive* (kolom baru saja).
2. **Jangan ubah format `PoNumber` yang sudah terbit.** Setelah sebuah order
   punya `PoNumber`, nilainya final.
3. Kalau butuh kolom baru di tabel bersama, koordinasikan dulu (lewat user) —
   jangan menambah migration sepihak di proyek Flutter tanpa memberi tahu sisi
   admin console, karena admin console membaca kolom-kolom ini secara langsung.
4. Tabel `order_driver_assignments` **sudah tidak dipakai** (digantikan oleh
   `Shipments`). Boleh diabaikan total dari sisi Flutter.
5. Real-time tracking yang dibutuhkan **hanya level status/badge** (Sedang
   Diproses / Dalam Perjalanan / Selesai), **bukan** live GPS breadcrumb di
   peta. Jadi tidak perlu tabel ping-GPS berkala — cukup update kolom status
   pada momen-momen tertentu (lihat state machine di bawah).

## 2. Dua status yang dipisah

- **PaymentStatus** (2 nilai) — **diturunkan**, bukan kolom sendiri:
  `Orders.PaidAt IS NULL` → `pending` ("Pending"); `Orders.PaidAt IS NOT NULL`
  → `paid` ("Sudah Dibayar"). Jadi cukup isi `Orders.PaidAt` saat pembayaran
  sukses, jangan menulis kolom PaymentStatus terpisah (tidak ada).
- **OrderStatus** (4 nilai, kolom baru `Orders.OrderStatus`, nullable) — hanya
  relevan setelah `PaidAt` terisi:
  - `processing` — "Sedang Diproses" (baru dibayar, sopir belum jalan)
  - `shipping` — "Dalam Perjalanan" (sopir sudah upload foto load-in)
  - `delivered` — "Pemesanan Selesai" (sopir sudah upload foto load-out)
  - `cancelled` — "Dibatalkan" (dibatalkan AdminTransport/SuperAdmin setelah
    dibayar, mis. stok habis — lihat `Orders.OrderStatusNote` untuk alasannya)

  Kolom lama `Orders.Status` (nvarchar, nilai yang sudah teramati di data:
  `pending_payment`, `paid`, `shipping`) **tetap dipertahankan** untuk
  backward-compat. **Mohon tetap isi juga `Status` lama** setiap kali mengisi
  `OrderStatus` yang baru, dengan pemetaan: `processing`→`paid`,
  `shipping`→`shipping`, `delivered`→`delivered`, `cancelled`→`cancelled`.

## 3. Tabel & siapa menulis kolom apa

### 3.1 `Orders` (sudah ada — kolom baru: `OrderStatus`, `OrderStatusNote`)

| Kolom | Diisi oleh | Kapan |
|---|---|---|
| `PoNumber` | Flutter/backend pemesanan | Saat **pembayaran sukses** (lihat §4 untuk algoritma format `GCS-{tahun}-{urutan}`) |
| `PaidAt` | Flutter/backend pemesanan | Saat pembayaran sukses |
| `OrderStatus` | Flutter/backend (set `processing` saat `PaidAt` diisi) → lalu Flutter/Transportir lagi saat foto load-in/out (`shipping`/`delivered`) | Lihat state machine §5 |
| `OrderStatusNote` | Admin console (AdminTransport/SuperAdmin) | Saat membatalkan order |
| `DeliveredAt` | Flutter/Transportir | Saat foto load-out diupload (bareng `OrderStatus='delivered'`) |
| `Vendor` | Flutter/backend pemesanan **saat order dibuat**; **bisa ditimpa admin console (AdminRegion)** setelah itu, lewat `PUT /orders/{id}/transport-partner` saat AdminRegion memilih mitra transportir untuk pengiriman | `ShipmentController` (antrian "Alokasi Sopir" AdminTransport) menyaring order lewat `Vendor == Users.CompanyName` — kalau Flutter mengisi nilai awal yang tidak match perusahaan transportir manapun, admin console akan menimpanya begitu AdminRegion menentukan mitra |

Admin console **tidak pernah membuat baris `Orders`** — itu murni domain
Flutter/backend pemesanan. Admin console hanya membaca, menampilkan, dan
(khusus AdminTransport/SuperAdmin) bisa men-set `OrderStatus='cancelled'`,
dan (khusus AdminRegion) bisa menimpa `Vendor` saat menentukan mitra
transportir.

### 3.2 `Shipments` (sudah ada sebelumnya, FK ke `Orders.Id`)

Tabel ini adalah **sumber kebenaran untuk alokasi sopir & tracking
pengiriman**. Kolom yang sudah ada sebelumnya: `ShipmentNumber`, `OrderId`,
`DriverName`, `Status`, `CreatedAt`, `MuatInCompletedAt`,
`MuatOutCompletedAt`, `CompletedAt`, `TotalDistanceMeters`, `UpdatedAt`,
`TransportirEmail`, `TruckLabel`, `PoliceNumber`, `DestinationLabel`,
`DestinationAddress`, `OriginLat/Lng`, `DestinationLat/Lng`.

Kolom baru yang ditambahkan admin console (additive):

| Kolom baru | Tipe | Keterangan |
|---|---|---|
| `WarehouseId` | bigint, FK → `warehouses.id` | Gudang asal yang dipilih AdminTransport |
| `MuatInPhotoUrl` | nvarchar(500) | URL foto load-in, **diisi Flutter Transportir** |
| `MuatOutPhotoUrl` | nvarchar(500) | URL foto load-out, **diisi Flutter Transportir** |
| `Note` | nvarchar(500) | Catatan AdminTransport untuk sopir |
| `AssignedBy` | nvarchar(256) | Email AdminTransport yang mengalokasikan |

**Siapa membuat baris `Shipments`:** Admin console (AdminTransport), saat
alokasi sopir. Status awal selalu `siap_muat`.

**Siapa mengubah `Status` setelah itu:** Flutter App sisi Transportir, lewat
2 transisi:

1. **Load-in** (sopir muat barang di gudang, sebelum berangkat):
   - Set `Shipments.MuatInPhotoUrl`, `Shipments.MuatInCompletedAt = now()`,
     `Shipments.Status = 'dalam_perjalanan'`.
   - **Sekaligus** set `Orders.OrderStatus = 'shipping'` dan
     `Orders.Status = 'shipping'` (Kiosk app baca dari `Orders`, bukan
     `Shipments`, jadi wajib disinkronkan).
2. **Load-out** (sopir tiba & serah-terima di kios tujuan):
   - Set `Shipments.MuatOutPhotoUrl`, `Shipments.MuatOutCompletedAt = now()`,
     `Shipments.CompletedAt = now()`, `Shipments.Status = 'selesai'`.
   - **Sekaligus** set `Orders.OrderStatus = 'delivered'`,
     `Orders.Status = 'delivered'`, `Orders.DeliveredAt = now()`.

Admin console **tidak menyediakan endpoint untuk memaksa transisi ini** —
sengaja, supaya `MuatInCompletedAt`/`MuatOutCompletedAt` selalu mencerminkan
kejadian nyata di lapangan yang dicatat Flutter.

`ShipmentRouteChecks` (FK → `Shipments.Id`) dibiarkan seperti adanya —
opsional, dipakai kalau Flutter ingin mencatat perbandingan jarak
ekspektasi vs aktual per checkpoint (`CheckType`, `ExpectedDistanceMeters`,
`ActualDistanceMeters`, `DistanceDiffMeters`). Admin console tidak
menulis/membaca tabel ini saat ini.

### 3.3 `warehouses` (baru, dikelola admin console)

`id, region, company_name, name, address, lat, lng, is_active, timestamps`.
Diisi/dikelola lewat halaman **Daftar Gudang** (AdminTransport/SuperAdmin).
Flutter cukup **membaca** lewat `Shipments.WarehouseId` → join `warehouses`
kalau perlu menampilkan nama/alamat gudang asal ke sopir.

### 3.4 `order_code_counters` (baru, untuk generate `PoNumber`)

`year (PK, smallint), last_seq (int), updated_at`. Dipakai untuk generate
`PoNumber` format `GCS-{tahun}-{urutan}` (urutan mulai 1, reset tiap tahun).
Lihat §4 untuk pola SQL atomic increment-nya — tabel ini bisa diakses
langsung lewat SQL apa pun yang connect ke `db_gcommers` (T-SQL, jadi
language-agnostic: C#/.NET, Dart via ODBC, dst).

### 3.5 Data lokasi kiosk yang sudah tersedia di `Users`

Tidak perlu tabel baru untuk kecamatan/kabupaten/provinsi — sudah ada:

- `Users.Region` — region GCommers (6 nilai fixed: Jawa Timur, Jawa Tengah
  Selatan, Jawa Tengah Utara, Makassar, Medan, Lampung)
- `Users.ProvinsiId` → FK `propinsi.id`
- `Users.KabupatenId` → FK `kabupaten.id`
- `Users.KecamatanId` → FK `kecamatan.id`
- `Users.Kecamatan` — nama kecamatan versi teks bebas (tetap dipakai untuk
  tampilan cepat tanpa join)

(Catatan: ada juga kolom legacy `nama_kec`/`nama_kab`/`nama_pro`/`id_kec`/
`id_kab`/`id_pro`/`kode_kec` di `Users` — semuanya **NULL di semua baris**,
jangan dipakai, itu sisa migrasi lama.)

## 4. Generate `PoNumber` = `GCS-{tahun}-{urutan}`

Order dibuat oleh Flutter/backend pemesanan (bukan admin console), jadi
algoritma generate kode harus dijalankan di sisi sana. Tabel
`order_code_counters` sudah disiapkan di DB bersama. Pola SQL atomic
increment (aman dari race condition, bisa dipanggil dari bahasa apa pun yang
connect ke SQL Server yang sama):

```sql
DECLARE @year INT = YEAR(GETDATE());
DECLARE @seq INT;

UPDATE order_code_counters
SET last_seq = last_seq + 1, @seq = last_seq + 1, updated_at = SYSDATETIME()
WHERE year = @year;

IF @@ROWCOUNT = 0
BEGIN
    SET @seq = 1;
    INSERT INTO order_code_counters (year, last_seq, updated_at) VALUES (@year, 1, SYSDATETIME());
END

-- PoNumber = 'GCS-' + CAST(@year AS NVARCHAR) + '-' + CAST(@seq AS NVARCHAR)
```

Jalankan dalam transaksi yang sama dengan proses konfirmasi pembayaran, lalu
simpan hasilnya ke `Orders.PoNumber`. Urutan **tidak perlu padding nol** —
`GCS-2026-1`, `GCS-2026-2`, dst (silakan padding kalau mau, tidak masalah
selama formatnya tetap diawali `GCS-{tahun}-`).

## 5. State machine lengkap

```
[Kiosk pesan & checkout]
        │
        ▼
  Orders.PaidAt = NULL          → PaymentStatus = pending  → tidak ada OrderStatus
        │  (bayar dalam 24 jam, VaExpiredAt sudah ada di Orders)
        ▼  pembayaran sukses
  Orders.PaidAt = now()
  Orders.PoNumber = GCS-{thn}-{urut}   (lihat §4)
  Orders.OrderStatus = 'processing'    → PaymentStatus = paid, "Sedang Diproses"
        │
        ▼  (ADMIN CONSOLE) AdminTransport alokasi sopir + pilih gudang
  Shipments row dibuat, Status = 'siap_muat'
        │
        ▼  (FLUTTER) Transportir upload foto LOAD-IN di gudang
  Shipments.Status = 'dalam_perjalanan', MuatInCompletedAt, MuatInPhotoUrl
  Orders.OrderStatus = 'shipping'      → "Dalam Perjalanan"
        │
        ▼  (FLUTTER) Transportir upload foto LOAD-OUT di kios tujuan
  Shipments.Status = 'selesai', MuatOutCompletedAt, MuatOutPhotoUrl, CompletedAt
  Orders.OrderStatus = 'delivered', DeliveredAt = now()   → "Pemesanan Selesai"

  (kapan saja setelah dibayar, AdminTransport/SuperAdmin bisa membatalkan:)
  Orders.OrderStatus = 'cancelled', OrderStatusNote = alasan
```

## 6. Checklist ringkas untuk sisi Flutter

- [ ] Saat pembayaran sukses: isi `PaidAt`, generate `PoNumber` (§4), set
      `OrderStatus='processing'` + `Status='paid'`.
- [ ] Layar status pesanan di Kiosk app baca `Orders.OrderStatus` (fallback ke
      `Status` lama kalau perlu kompatibilitas), bukan `Shipments.Status`.
- [ ] Layar Transportir baca `Shipments` (join `warehouses` untuk nama/alamat
      gudang) untuk tahu order mana yang dialokasikan ke dia
      (`Shipments.TransportirEmail = email login`).
- [ ] Upload foto load-in → update `Shipments` (lihat §3.2 poin 1) **dan**
      `Orders` (sinkron status) dalam transaksi yang sama.
- [ ] Upload foto load-out → update `Shipments` (lihat §3.2 poin 2) **dan**
      `Orders` dalam transaksi yang sama.
- [ ] Jangan menulis ke `order_driver_assignments` (deprecated) atau membuat
      baris `Shipments` sendiri — baris `Shipments` dibuat oleh admin console
      saat AdminTransport mengalokasikan sopir; Flutter hanya **update** baris
      yang sudah ada (dicari lewat `OrderId`).
- [ ] Tidak perlu kirim GPS berkala — cukup 2 timestamp + 2 foto di atas.
