<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

/**
 * Comprehensive demo seeder for Gcommers Admin Console.
 *
 * Creates a complete, interlinked dataset covering all three admin roles:
 *   - SuperAdmin       (superadmin@demo.gcs     / Admin@1234)
 *   - AdminRegion x2   (adminregion.jatim@demo.gcs / adminregion.jateng@demo.gcs)
 *   - AdminTransport x2 (admintransport.gln@demo.gcs / admintransport.sls@demo.gcs)
 *
 * Also creates demo kiosk + transportir users, 10 demo orders, and admin workflow
 * records (alokasi biaya, quota subsidi, alokasi sopir, tagihan transport) in
 * various approval states (draft / submitted / approved / rejected).
 *
 * Safe to run multiple times — idempotent via cleanup first.
 */
class GcommersSeeder extends Seeder
{
    private const SUFFIX = '@demo.gcs';

    // ── helpers ──────────────────────────────────────────────────────────────

    private function e(string $local): string
    {
        return $local . self::SUFFIX;
    }

    // ── entry point ───────────────────────────────────────────────────────────

    public function run(): void
    {
        $this->command->info('');
        $this->command->info('┌─────────────────────────────────────────────────┐');
        $this->command->info('│  GcommersSeeder — demo data (@demo.gcs)         │');
        $this->command->info('└─────────────────────────────────────────────────┘');

        $this->cleanPreviousDemoData();
        $userIds  = $this->seedUsers();
        $this->seedAdminCredentials($userIds);
        $orderIds = $this->seedOrders();
        $this->seedOrderCostAllocations($orderIds);
        $this->seedSubsidyQuotas();
        $this->seedDriverAssignments($orderIds);
        $this->seedTransportBillings();

        $this->command->info('');
        $this->command->info('✅  Selesai! Login admin:');
        $this->command->table(
            ['Role', 'Email', 'Password'],
            [
                ['SuperAdmin',      $this->e('superadmin'),           'Admin@1234'],
                ['AdminRegion',     $this->e('adminregion.jatim'),    'Admin@1234'],
                ['AdminRegion',     $this->e('adminregion.jateng'),   'Admin@1234'],
                ['AdminTransport',  $this->e('admintransport.gln'),   'Admin@1234'],
                ['AdminTransport',  $this->e('admintransport.sls'),   'Admin@1234'],
            ]
        );
    }

    // ── 0. cleanup ────────────────────────────────────────────────────────────

    private function cleanPreviousDemoData(): void
    {
        $this->command->info('  🗑  Membersihkan data demo lama…');

        // Collect demo order IDs
        $demoOrderIds = DB::table('Orders')
            ->where('PoNumber', 'like', 'GCS-DEMO-%')
            ->pluck('Id')
            ->toArray();

        if (!empty($demoOrderIds)) {
            DB::table('order_cost_allocations')->whereIn('order_id', $demoOrderIds)->delete();
            DB::table('order_driver_assignments')->whereIn('order_id', $demoOrderIds)->delete();
            // OrderItems / OrderEvents live in shared tables — safe to clean demo rows
            DB::table('OrderEvents')->whereIn('OrderId', $demoOrderIds)->delete();
            DB::table('OrderItems')->whereIn('OrderId', $demoOrderIds)->delete();
            DB::table('Orders')->whereIn('Id', $demoOrderIds)->delete();
        }

        // Collect demo user IDs
        $demoUserIds = DB::table('Users')
            ->where('Email', 'like', '%' . self::SUFFIX)
            ->pluck('Id')
            ->toArray();

        if (!empty($demoUserIds)) {
            DB::table('admin_credentials')->whereIn('user_id', $demoUserIds)->delete();
        }

        // Admin-only tables keyed by email strings
        DB::table('subsidy_quotas')->where('created_by', 'like', '%' . self::SUFFIX)->delete();
        DB::table('transport_billings')->where('submitted_by', 'like', '%' . self::SUFFIX)
            ->orWhere('company_name', 'like', '% (Demo)')
            ->delete();

        if (!empty($demoUserIds)) {
            DB::table('Users')->whereIn('Id', $demoUserIds)->delete();
        }
    }

    // ── 1. users ──────────────────────────────────────────────────────────────

    /**
     * Returns [email => userId] map for all inserted demo users.
     *
     * Role values stored in Users.Role:
     *   'superadmin'  → SuperAdmin in admin console
     *   'admin'       → AdminRegion in admin console
     *   'transportir' → AdminTransport OR regular driver (distinguished by admin_credentials)
     *   'kiosk'       → kiosk user (Flutter app only)
     */
    private function seedUsers(): array
    {
        $this->command->info('  👤  Membuat Users demo…');

        /*
         * Schema: [email, role_db, displayName, region, companyName, transportirName, kioskName]
         * Catatan: kolom binary (PasswordHash, PasswordSalt) diisi dengan HASHBYTES
         *          sehingga user ini tidak bisa login ke Flutter app — hanya untuk demo.
         */
        $rows = [
            // ── Admin users ─────────────────────────────────────────────
            [$this->e('superadmin'),          'superadmin',  'Budi Santoso (Demo)',       null,          null,                              null,                              null],
            [$this->e('adminregion.jatim'),   'admin',       'Siti Rahayu (Demo)',        'Jawa Timur',  null,                              null,                              null],
            [$this->e('adminregion.jateng'),  'admin',       'Ahmad Yusuf (Demo)',        'Jawa Tengah', null,                              null,                              null],
            [$this->e('admintransport.gln'),  'transportir', 'Dimas Setiawan (Demo)',     null,          'PT Global Logistik Nusantara',    'PT Global Logistik Nusantara',    null],
            [$this->e('admintransport.sls'),  'transportir', 'Putri Wulandari (Demo)',    null,          'PT Surya Logistik Sejahtera',     'PT Surya Logistik Sejahtera',     null],
            // ── Kiosk users ─────────────────────────────────────────────
            [$this->e('kiosk.srg'),           'kiosk',       'Kios Sartini Surabaya',     'Jawa Timur',  null,                              null,                              'Kios Sartini Surabaya'],
            [$this->e('kiosk.mlg'),           'kiosk',       'Kios Pak Harto Malang',     'Jawa Timur',  null,                              null,                              'Kios Pak Harto Malang'],
            [$this->e('kiosk.smg'),           'kiosk',       'Kios Bu Wati Semarang',     'Jawa Tengah', null,                              null,                              'Kios Bu Wati Semarang'],
            [$this->e('kiosk.slw'),           'kiosk',       'Kios Pak Bejo Salatiga',    'Jawa Tengah', null,                              null,                              'Kios Pak Bejo Salatiga'],
            // ── Transportir / drivers ───────────────────────────────────
            [$this->e('sopir.andi'),          'transportir', 'Andi Wijaya',               null,          'PT Global Logistik Nusantara',    'Andi Wijaya',                     null],
            [$this->e('sopir.budi'),          'transportir', 'Budi Prasetyo',             null,          'PT Global Logistik Nusantara',    'Budi Prasetyo',                   null],
            [$this->e('sopir.candra'),        'transportir', 'Candra Halim',              null,          'PT Surya Logistik Sejahtera',     'Candra Halim',                    null],
        ];

        $ids = [];

        foreach ($rows as [$email, $role, $name, $region, $company, $transportirName, $kioskName]) {
            // SQL Server conditional insert — binary fields use server-side HASHBYTES
            DB::statement(
                "IF NOT EXISTS (SELECT 1 FROM [Users] WHERE [Email] = ?)
                 INSERT INTO [Users]
                     ([Email],[PasswordHash],[PasswordSalt],[Role],[DisplayName],
                      [Region],[CompanyName],[TransportirName],[KioskName],
                      [CreatedAt],[UpdatedAt])
                 VALUES
                     (?,
                      HASHBYTES('SHA2_512', 'gcommers_demo_seed'),
                      HASHBYTES('SHA2_256', 'gcommers_demo_salt'),
                      ?,?,?,?,?,?,
                      SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET())",
                [$email, $email, $role, $name, $region, $company, $transportirName, $kioskName]
            );

            $ids[$email] = DB::table('Users')->where('Email', $email)->value('Id');
        }

        return $ids;
    }

    // ── 2. admin_credentials ──────────────────────────────────────────────────

    private function seedAdminCredentials(array $userIds): void
    {
        $this->command->info('  🔑  Membuat admin_credentials (password: Admin@1234)…');

        $adminEmails = [
            $this->e('superadmin'),
            $this->e('adminregion.jatim'),
            $this->e('adminregion.jateng'),
            $this->e('admintransport.gln'),
            $this->e('admintransport.sls'),
        ];

        $password = Hash::make('Admin@1234');

        foreach ($adminEmails as $email) {
            $userId = $userIds[$email] ?? null;
            if (!$userId) {
                $this->command->warn("    ⚠  User ID tidak ditemukan untuk $email — dilewati.");
                continue;
            }

            DB::table('admin_credentials')->updateOrInsert(
                ['user_id' => $userId],
                ['password' => $password, 'last_login_at' => null, 'created_at' => now(), 'updated_at' => now()]
            );
        }
    }

    // ── 3. orders ─────────────────────────────────────────────────────────────

    /**
     * Returns [PoNumber => orderId] map.
     *
     * 10 pesanan demo mencakup semua status (delivered, on_delivery, processing,
     * pending, cancelled) dari kedua perusahaan transport dan kedua region.
     */
    private function seedOrders(): array
    {
        $this->command->info('  📦  Membuat Orders demo…');

        $SRG = $this->e('kiosk.srg');
        $MLG = $this->e('kiosk.mlg');
        $SMG = $this->e('kiosk.smg');
        $SLW = $this->e('kiosk.slw');
        $GLN = 'PT Global Logistik Nusantara';
        $SLS = 'PT Surya Logistik Sejahtera';
        $VA  = 'Bank Transfer (Mandiri)';

        $rows = [
            // ── GLN / Jawa Timur ──────────────────────────────────────────
            [
                'PoNumber' => 'GCS-DEMO-001', 'UserEmail' => $SRG,
                'Status' => 'delivered', 'Vendor' => $GLN, 'PaymentMethod' => $VA,
                'Subtotal' => 5000000, 'TaxAmount' => 500000, 'ShippingAmount' => 50000, 'TotalAmount' => 5550000,
                'CreatedAt' => '2026-06-01 08:00:00.0000000 +07:00', 'UpdatedAt' => '2026-06-05 14:00:00.0000000 +07:00',
                'PaidAt'    => '2026-06-01 09:00:00.0000000 +07:00', 'DeliveredAt' => '2026-06-05 14:00:00.0000000 +07:00',
            ],
            [
                'PoNumber' => 'GCS-DEMO-002', 'UserEmail' => $MLG,
                'Status' => 'delivered', 'Vendor' => $GLN, 'PaymentMethod' => $VA,
                'Subtotal' => 3000000, 'TaxAmount' => 300000, 'ShippingAmount' => 45000, 'TotalAmount' => 3345000,
                'CreatedAt' => '2026-06-03 10:00:00.0000000 +07:00', 'UpdatedAt' => '2026-06-07 11:00:00.0000000 +07:00',
                'PaidAt'    => '2026-06-03 11:00:00.0000000 +07:00', 'DeliveredAt' => '2026-06-07 11:00:00.0000000 +07:00',
            ],
            [
                'PoNumber' => 'GCS-DEMO-003', 'UserEmail' => $SRG,
                'Status' => 'delivered', 'Vendor' => $GLN, 'PaymentMethod' => $VA,
                'Subtotal' => 4000000, 'TaxAmount' => 400000, 'ShippingAmount' => 50000, 'TotalAmount' => 4450000,
                'CreatedAt' => '2026-06-06 09:00:00.0000000 +07:00', 'UpdatedAt' => '2026-06-10 15:00:00.0000000 +07:00',
                'PaidAt'    => '2026-06-06 10:00:00.0000000 +07:00', 'DeliveredAt' => '2026-06-10 15:00:00.0000000 +07:00',
            ],
            [
                'PoNumber' => 'GCS-DEMO-004', 'UserEmail' => $MLG,
                'Status' => 'on_delivery', 'Vendor' => $GLN, 'PaymentMethod' => $VA,
                'Subtotal' => 2000000, 'TaxAmount' => 200000, 'ShippingAmount' => 40000, 'TotalAmount' => 2240000,
                'CreatedAt' => '2026-06-08 11:00:00.0000000 +07:00', 'UpdatedAt' => '2026-06-11 08:00:00.0000000 +07:00',
                'PaidAt'    => '2026-06-08 12:00:00.0000000 +07:00', 'DeliveredAt' => null,
            ],
            [
                'PoNumber' => 'GCS-DEMO-005', 'UserEmail' => $SRG,
                'Status' => 'processing', 'Vendor' => $GLN, 'PaymentMethod' => $VA,
                'Subtotal' => 6000000, 'TaxAmount' => 600000, 'ShippingAmount' => 55000, 'TotalAmount' => 6655000,
                'CreatedAt' => '2026-06-10 14:00:00.0000000 +07:00', 'UpdatedAt' => '2026-06-11 11:00:00.0000000 +07:00',
                'PaidAt'    => '2026-06-10 15:00:00.0000000 +07:00', 'DeliveredAt' => null,
            ],
            [
                'PoNumber' => 'GCS-DEMO-006', 'UserEmail' => $MLG,
                'Status' => 'pending', 'Vendor' => $GLN, 'PaymentMethod' => '-',
                'Subtotal' => 2000000, 'TaxAmount' => 200000, 'ShippingAmount' => 40000, 'TotalAmount' => 2240000,
                'CreatedAt' => '2026-06-11 15:00:00.0000000 +07:00', 'UpdatedAt' => '2026-06-11 15:00:00.0000000 +07:00',
                'PaidAt'    => null, 'DeliveredAt' => null,
            ],
            // ── SLS / Jawa Tengah ─────────────────────────────────────────
            [
                'PoNumber' => 'GCS-DEMO-007', 'UserEmail' => $SMG,
                'Status' => 'delivered', 'Vendor' => $SLS, 'PaymentMethod' => $VA,
                'Subtotal' => 2500000, 'TaxAmount' => 250000, 'ShippingAmount' => 42000, 'TotalAmount' => 2792000,
                'CreatedAt' => '2026-06-02 09:00:00.0000000 +07:00', 'UpdatedAt' => '2026-06-06 13:00:00.0000000 +07:00',
                'PaidAt'    => '2026-06-02 10:00:00.0000000 +07:00', 'DeliveredAt' => '2026-06-06 13:00:00.0000000 +07:00',
            ],
            [
                'PoNumber' => 'GCS-DEMO-008', 'UserEmail' => $SLW,
                'Status' => 'delivered', 'Vendor' => $SLS, 'PaymentMethod' => $VA,
                'Subtotal' => 1500000, 'TaxAmount' => 150000, 'ShippingAmount' => 38000, 'TotalAmount' => 1688000,
                'CreatedAt' => '2026-06-04 08:00:00.0000000 +07:00', 'UpdatedAt' => '2026-06-08 16:00:00.0000000 +07:00',
                'PaidAt'    => '2026-06-04 09:00:00.0000000 +07:00', 'DeliveredAt' => '2026-06-08 16:00:00.0000000 +07:00',
            ],
            [
                'PoNumber' => 'GCS-DEMO-009', 'UserEmail' => $SMG,
                'Status' => 'on_delivery', 'Vendor' => $SLS, 'PaymentMethod' => $VA,
                'Subtotal' => 3500000, 'TaxAmount' => 350000, 'ShippingAmount' => 45000, 'TotalAmount' => 3895000,
                'CreatedAt' => '2026-06-09 10:00:00.0000000 +07:00', 'UpdatedAt' => '2026-06-11 09:00:00.0000000 +07:00',
                'PaidAt'    => '2026-06-09 11:00:00.0000000 +07:00', 'DeliveredAt' => null,
            ],
            [
                'PoNumber' => 'GCS-DEMO-010', 'UserEmail' => $SLW,
                'Status' => 'processing', 'Vendor' => $SLS, 'PaymentMethod' => $VA,
                'Subtotal' => 1000000, 'TaxAmount' => 100000, 'ShippingAmount' => 35000, 'TotalAmount' => 1135000,
                'CreatedAt' => '2026-06-11 08:00:00.0000000 +07:00', 'UpdatedAt' => '2026-06-11 10:00:00.0000000 +07:00',
                'PaidAt'    => '2026-06-11 09:00:00.0000000 +07:00', 'DeliveredAt' => null,
            ],
        ];

        $ids = [];

        foreach ($rows as $row) {
            if (!DB::table('Orders')->where('PoNumber', $row['PoNumber'])->exists()) {
                DB::table('Orders')->insert($row);
            }
            $ids[$row['PoNumber']] = DB::table('Orders')->where('PoNumber', $row['PoNumber'])->value('Id');
        }

        return $ids;
    }

    // ── 4. order_cost_allocations ─────────────────────────────────────────────

    /**
     * Alokasi biaya per pesanan dari AdminRegion ke SuperAdmin.
     * Menampilkan semua status workflow: approved, submitted, draft.
     *
     * PPH  = 0.25% × TotalAmount
     * PPN  = 11% × ShippingAmount
     * Total = shipping_cost + pph_amount + ppn_amount
     */
    private function seedOrderCostAllocations(array $orderIds): void
    {
        $this->command->info('  💰  Membuat order_cost_allocations…');

        $jatim    = $this->e('adminregion.jatim');
        $jateng   = $this->e('adminregion.jateng');
        $sadmin   = $this->e('superadmin');

        $rows = [
            // ── approved (Jawa Timur) ──────────────────────────────────────
            [
                'order_id'       => $orderIds['GCS-DEMO-001'],
                'region'         => 'Jawa Timur',
                'shipping_cost'  => 50000.00,
                'pph_amount'     => 13875.00,   // 0.25% × 5,550,000
                'ppn_amount'     => 5500.00,    // 11% × 50,000
                'total_allocated'=> 69375.00,
                'notes'          => 'Alokasi pesanan Sartini Surabaya Juni 2026',
                'status'         => 'approved',
                'allocated_by'   => $jatim,
                'reviewed_by'    => $sadmin,
                'reviewed_at'    => '2026-06-06 10:00:00',
                'review_note'    => 'Disetujui — tarif sesuai ketentuan berlaku',
            ],
            [
                'order_id'       => $orderIds['GCS-DEMO-002'],
                'region'         => 'Jawa Timur',
                'shipping_cost'  => 45000.00,
                'pph_amount'     => 8363.00,    // 0.25% × 3,345,000
                'ppn_amount'     => 4950.00,    // 11% × 45,000
                'total_allocated'=> 58313.00,
                'notes'          => 'Alokasi pesanan Pak Harto Malang Juni 2026',
                'status'         => 'approved',
                'allocated_by'   => $jatim,
                'reviewed_by'    => $sadmin,
                'reviewed_at'    => '2026-06-08 09:00:00',
                'review_note'    => 'Disetujui',
            ],
            [
                'order_id'       => $orderIds['GCS-DEMO-003'],
                'region'         => 'Jawa Timur',
                'shipping_cost'  => 50000.00,
                'pph_amount'     => 11125.00,   // 0.25% × 4,450,000
                'ppn_amount'     => 5500.00,    // 11% × 50,000
                'total_allocated'=> 66625.00,
                'notes'          => 'Pesanan ke-3 Sartini Surabaya',
                'status'         => 'submitted',
                'allocated_by'   => $jatim,
                'reviewed_by'    => null,
                'reviewed_at'    => null,
                'review_note'    => null,
            ],
            // ── approved (Jawa Tengah) ─────────────────────────────────────
            [
                'order_id'       => $orderIds['GCS-DEMO-007'],
                'region'         => 'Jawa Tengah',
                'shipping_cost'  => 42000.00,
                'pph_amount'     => 6980.00,    // 0.25% × 2,792,000
                'ppn_amount'     => 4620.00,    // 11% × 42,000
                'total_allocated'=> 53600.00,
                'notes'          => 'Alokasi pesanan Bu Wati Semarang Juni 2026',
                'status'         => 'approved',
                'allocated_by'   => $jateng,
                'reviewed_by'    => $sadmin,
                'reviewed_at'    => '2026-06-07 11:00:00',
                'review_note'    => 'Disetujui — sesuai tarif regional',
            ],
            [
                'order_id'       => $orderIds['GCS-DEMO-008'],
                'region'         => 'Jawa Tengah',
                'shipping_cost'  => 38000.00,
                'pph_amount'     => 4220.00,    // 0.25% × 1,688,000
                'ppn_amount'     => 4180.00,    // 11% × 38,000
                'total_allocated'=> 46400.00,
                'notes'          => 'Pesanan Pak Bejo Salatiga',
                'status'         => 'submitted',
                'allocated_by'   => $jateng,
                'reviewed_by'    => null,
                'reviewed_at'    => null,
                'review_note'    => null,
            ],
            // ── draft (masih diproses) ─────────────────────────────────────
            [
                'order_id'       => $orderIds['GCS-DEMO-005'],
                'region'         => 'Jawa Timur',
                'shipping_cost'  => 55000.00,
                'pph_amount'     => 16638.00,   // 0.25% × 6,655,000
                'ppn_amount'     => 6050.00,    // 11% × 55,000
                'total_allocated'=> 77688.00,
                'notes'          => 'Pesanan masih dalam proses — draft sementara',
                'status'         => 'draft',
                'allocated_by'   => $jatim,
                'reviewed_by'    => null,
                'reviewed_at'    => null,
                'review_note'    => null,
            ],
            // ── rejected (contoh kasus ditolak) ───────────────────────────
            [
                'order_id'       => $orderIds['GCS-DEMO-009'],
                'region'         => 'Jawa Tengah',
                'shipping_cost'  => 45000.00,
                'pph_amount'     => 9738.00,    // 0.25% × 3,895,000
                'ppn_amount'     => 4950.00,    // 11% × 45,000
                'total_allocated'=> 59688.00,
                'notes'          => 'Ajuan pertama — ditolak untuk revisi',
                'status'         => 'rejected',
                'allocated_by'   => $jateng,
                'reviewed_by'    => $sadmin,
                'reviewed_at'    => '2026-06-10 16:00:00',
                'review_note'    => 'Biaya pengiriman melebihi batas maksimum kontrak — mohon dikoreksi',
            ],
        ];

        foreach ($rows as $row) {
            DB::table('order_cost_allocations')->updateOrInsert(
                ['order_id' => $row['order_id']],
                array_merge($row, ['created_at' => now(), 'updated_at' => now()])
            );
        }
    }

    // ── 5. subsidy_quotas ─────────────────────────────────────────────────────

    /**
     * Quota pupuk subsidi per kiosk per periode dari dua region.
     * Status: approved (×3), submitted (×2), draft (×1).
     */
    private function seedSubsidyQuotas(): void
    {
        $this->command->info('  🌾  Membuat subsidy_quotas…');

        $jatim  = $this->e('adminregion.jatim');
        $jateng = $this->e('adminregion.jateng');
        $sadmin = $this->e('superadmin');

        $rows = [
            // ── Jawa Timur — approved ──────────────────────────────────────
            [
                'region'      => 'Jawa Timur',
                'kiosk_email' => $this->e('kiosk.srg'),
                'product_code'=> 'UREA-50',
                'quota_kg'    => 5000.00,
                'used_kg'     => 3200.00, // 3.2 ton sudah disalurkan
                'period'      => '2026-06',
                'status'      => 'approved',
                'created_by'  => $jatim,
                'reviewed_by' => $sadmin,
                'reviewed_at' => '2026-05-30 09:00:00',
                'review_note' => 'Disetujui sesuai alokasi pusat Jawa Timur bulan Juni',
            ],
            [
                'region'      => 'Jawa Timur',
                'kiosk_email' => $this->e('kiosk.mlg'),
                'product_code'=> 'UREA-50',
                'quota_kg'    => 3000.00,
                'used_kg'     => 1500.00,
                'period'      => '2026-06',
                'status'      => 'approved',
                'created_by'  => $jatim,
                'reviewed_by' => $sadmin,
                'reviewed_at' => '2026-05-30 09:30:00',
                'review_note' => 'Disetujui',
            ],
            [
                'region'      => 'Jawa Timur',
                'kiosk_email' => $this->e('kiosk.srg'),
                'product_code'=> 'NPK-50',
                'quota_kg'    => 2000.00,
                'used_kg'     => 800.00,
                'period'      => '2026-06',
                'status'      => 'approved',
                'created_by'  => $jatim,
                'reviewed_by' => $sadmin,
                'reviewed_at' => '2026-05-30 10:00:00',
                'review_note' => 'Disetujui — NPK Phonska Kios Sartini',
            ],
            // ── Jawa Tengah — submitted (menunggu persetujuan) ─────────────
            [
                'region'      => 'Jawa Tengah',
                'kiosk_email' => $this->e('kiosk.smg'),
                'product_code'=> 'UREA-50',
                'quota_kg'    => 4000.00,
                'used_kg'     => 0.00,
                'period'      => '2026-06',
                'status'      => 'submitted',
                'created_by'  => $jateng,
                'reviewed_by' => null,
                'reviewed_at' => null,
                'review_note' => null,
            ],
            [
                'region'      => 'Jawa Tengah',
                'kiosk_email' => $this->e('kiosk.slw'),
                'product_code'=> 'UREA-50',
                'quota_kg'    => 2500.00,
                'used_kg'     => 0.00,
                'period'      => '2026-06',
                'status'      => 'submitted',
                'created_by'  => $jateng,
                'reviewed_by' => null,
                'reviewed_at' => null,
                'review_note' => null,
            ],
            // ── Jawa Tengah — draft (belum diajukan) ──────────────────────
            [
                'region'      => 'Jawa Tengah',
                'kiosk_email' => $this->e('kiosk.smg'),
                'product_code'=> 'NPK-50',
                'quota_kg'    => 1500.00,
                'used_kg'     => 0.00,
                'period'      => '2026-06',
                'status'      => 'draft',
                'created_by'  => $jateng,
                'reviewed_by' => null,
                'reviewed_at' => null,
                'review_note' => null,
            ],
        ];

        foreach ($rows as $row) {
            DB::table('subsidy_quotas')->insert(
                array_merge($row, ['created_at' => now(), 'updated_at' => now()])
            );
        }
    }

    // ── 6. order_driver_assignments ───────────────────────────────────────────

    /**
     * Alokasi sopir ke pesanan dari dua AdminTransport.
     * Sopir dari GLN menangani pesanan GLN; sopir SLS menangani pesanan SLS.
     */
    private function seedDriverAssignments(array $orderIds): void
    {
        $this->command->info('  🚛  Membuat order_driver_assignments…');

        $adminGln = $this->e('admintransport.gln');
        $adminSls = $this->e('admintransport.sls');
        $andi     = $this->e('sopir.andi');
        $budi     = $this->e('sopir.budi');
        $candra   = $this->e('sopir.candra');

        $rows = [
            // ── GLN drivers ───────────────────────────────────────────────
            ['order_id' => $orderIds['GCS-DEMO-001'], 'transportir_email' => $andi,   'assigned_by' => $adminGln, 'note' => 'Pengiriman area Surabaya — prioritas pagi'],
            ['order_id' => $orderIds['GCS-DEMO-002'], 'transportir_email' => $budi,   'assigned_by' => $adminGln, 'note' => 'Pengiriman area Malang'],
            ['order_id' => $orderIds['GCS-DEMO-003'], 'transportir_email' => $andi,   'assigned_by' => $adminGln, 'note' => null],
            ['order_id' => $orderIds['GCS-DEMO-004'], 'transportir_email' => $budi,   'assigned_by' => $adminGln, 'note' => 'Masih dalam perjalanan'],
            ['order_id' => $orderIds['GCS-DEMO-005'], 'transportir_email' => $andi,   'assigned_by' => $adminGln, 'note' => 'Pesanan besar — prioritas khusus'],
            // ── SLS drivers ───────────────────────────────────────────────
            ['order_id' => $orderIds['GCS-DEMO-007'], 'transportir_email' => $candra, 'assigned_by' => $adminSls, 'note' => 'Pengiriman area Semarang'],
            ['order_id' => $orderIds['GCS-DEMO-008'], 'transportir_email' => $candra, 'assigned_by' => $adminSls, 'note' => 'Pengiriman area Salatiga'],
            ['order_id' => $orderIds['GCS-DEMO-009'], 'transportir_email' => $candra, 'assigned_by' => $adminSls, 'note' => 'Dalam perjalanan ke Semarang'],
        ];

        foreach ($rows as $row) {
            DB::table('order_driver_assignments')->updateOrInsert(
                ['order_id' => $row['order_id']],
                array_merge($row, ['created_at' => now(), 'updated_at' => now()])
            );
        }
    }

    // ── 7. transport_billings ─────────────────────────────────────────────────

    /**
     * Tagihan transport per perusahaan per periode.
     * GLN → submitted (menunggu approve SuperAdmin)
     * SLS → draft (belum diajukan)
     *
     * total_shipping dihitung dari pesanan delivered pada periode tersebut:
     *   GLN delivered: DEMO-001 (50k) + DEMO-002 (45k) + DEMO-003 (50k) = 145,000
     *   SLS delivered: DEMO-007 (42k) + DEMO-008 (38k) = 80,000
     */
    private function seedTransportBillings(): void
    {
        $this->command->info('  🧾  Membuat transport_billings…');

        $adminGln = $this->e('admintransport.gln');
        $sadmin   = $this->e('superadmin');

        $rows = [
            [
                'company_name'   => 'PT Global Logistik Nusantara',
                'period'         => '2026-06',
                'total_orders'   => 3,
                'total_shipping' => 145000.00,
                'total_amount'   => 145000.00,
                'status'         => 'submitted',
                'submitted_by'   => $adminGln,
                'reviewed_by'    => null,
                'reviewed_at'    => null,
                'note'           => '3 pesanan terdelivery pada Juni 2026 (DEMO-001, 002, 003)',
            ],
            [
                'company_name'   => 'PT Surya Logistik Sejahtera',
                'period'         => '2026-06',
                'total_orders'   => 2,
                'total_shipping' => 80000.00,
                'total_amount'   => 80000.00,
                'status'         => 'draft',
                'submitted_by'   => null,
                'reviewed_by'    => null,
                'reviewed_at'    => null,
                'note'           => null,
            ],
        ];

        foreach ($rows as $row) {
            DB::table('transport_billings')->updateOrInsert(
                ['company_name' => $row['company_name'], 'period' => $row['period']],
                array_merge($row, ['created_at' => now(), 'updated_at' => now()])
            );
        }
    }
}
