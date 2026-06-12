<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Drops all admin-specific tables created by previous migrations (2026_06_08_*)
 * and recreates them with a clean, consolidated schema including approval workflow fields.
 *
 * Shared tables (Orders, Users, Products, etc.) are NOT touched.
 */
return new class extends Migration
{
    public function up(): void
    {
        // Drop in reverse dependency order (safe — dropIfExists handles missing tables)
        Schema::dropIfExists('order_cost_allocations');
        Schema::dropIfExists('transport_billings');
        Schema::dropIfExists('order_driver_assignments');
        Schema::dropIfExists('subsidy_quotas');
        Schema::dropIfExists('settings');
        Schema::dropIfExists('admin_credentials');

        // ── 1. admin_credentials ────────────────────────────────────────────────
        // Stores bcrypt passwords for admin users separate from the Flutter app
        // password scheme (PBKDF2 stored in Users.PasswordHash / Users.PasswordSalt).
        Schema::create('admin_credentials', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('user_id')->unique(); // FK → dbo.Users.Id
            $table->string('password');                      // bcrypt hash
            $table->timestamp('last_login_at')->nullable();
            $table->timestamps();
        });

        // ── 2. settings ─────────────────────────────────────────────────────────
        // Configurable fee reference rates used across allocation workflows.
        Schema::create('settings', function (Blueprint $table) {
            $table->id();
            $table->string('key')->unique();
            $table->string('value');
            $table->string('label');
            $table->string('unit')->nullable();
            $table->timestamps();
        });

        DB::table('settings')->insert([
            [
                'key'        => 'biaya_pengiriman_dasar',
                'value'      => '10000',
                'label'      => 'Biaya Pengiriman Dasar',
                'unit'       => 'IDR',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'key'        => 'biaya_pengiriman_per_km',
                'value'      => '2000',
                'label'      => 'Biaya Pengiriman per KM',
                'unit'       => 'IDR/km',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'key'        => 'pph_persen',
                'value'      => '0.25',
                'label'      => 'Tarif PPH (Pemotongan Pajak)',
                'unit'       => '%',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'key'        => 'ppn_persen',
                'value'      => '11',
                'label'      => 'Tarif PPN (Pajak Pertambahan Nilai)',
                'unit'       => '%',
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);

        // ── 3. subsidy_quotas ────────────────────────────────────────────────────
        // Quota pupuk subsidi yang dialokasikan oleh AdminRegion per kiosk per periode.
        // Alur: AdminRegion buat draft → submit → SuperAdmin approve/reject.
        Schema::create('subsidy_quotas', function (Blueprint $table) {
            $table->id();
            $table->string('region', 100);                   // matches Users.Region of AdminRegion
            $table->string('kiosk_email', 256)->nullable();  // FK loose → Users.Email (Role=kiosk)
            $table->string('product_code', 50)->nullable();  // FK loose → Products.ProductCode
            $table->decimal('quota_kg', 12, 2);
            $table->decimal('used_kg', 12, 2)->default(0);  // realisasi penyaluran
            $table->string('period', 7);                     // YYYY-MM
            $table->string('status', 20)->default('draft');  // draft|submitted|approved|rejected
            $table->string('created_by', 256);               // AdminRegion email
            $table->string('reviewed_by', 256)->nullable();  // SuperAdmin email
            $table->timestamp('reviewed_at')->nullable();
            $table->text('review_note')->nullable();
            $table->timestamps();
        });

        // ── 4. order_driver_assignments ──────────────────────────────────────────
        // Alokasi sopir (transportir) ke pesanan oleh AdminTransport.
        Schema::create('order_driver_assignments', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('order_id')->unique(); // FK loose → Orders.Id
            $table->string('transportir_email', 256);         // FK loose → Users.Email (Role=transportir)
            $table->string('assigned_by', 256);               // AdminTransport email
            $table->text('note')->nullable();
            $table->timestamps();
        });

        // ── 5. transport_billings ────────────────────────────────────────────────
        // Rekap tagihan biaya pengiriman per perusahaan transport per periode.
        // Alur: AdminTransport buat draft → submit → SuperAdmin approve/reject.
        Schema::create('transport_billings', function (Blueprint $table) {
            $table->id();
            $table->string('company_name', 200);             // matches Users.CompanyName of AdminTransport
            $table->string('period', 7);                     // YYYY-MM
            $table->unsignedInteger('total_orders')->default(0);
            $table->decimal('total_shipping', 16, 2)->default(0);
            $table->decimal('total_amount', 16, 2)->default(0);
            $table->string('status', 20)->default('draft'); // draft|submitted|approved|rejected
            $table->string('submitted_by', 256)->nullable();
            $table->string('reviewed_by', 256)->nullable(); // SuperAdmin email
            $table->timestamp('reviewed_at')->nullable();
            $table->text('note')->nullable();
            $table->timestamps();

            $table->unique(['company_name', 'period']);
        });

        // ── 6. order_cost_allocations ────────────────────────────────────────────
        // Alokasi biaya pengiriman + PPH + PPN per pesanan oleh AdminRegion.
        // Alur: AdminRegion input → simpan draft → submit → SuperAdmin approve/reject.
        Schema::create('order_cost_allocations', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('order_id')->unique(); // FK loose → Orders.Id
            $table->string('region', 100);                    // matches Users.Region of AdminRegion
            $table->decimal('shipping_cost', 16, 2)->default(0);
            $table->decimal('pph_amount', 16, 2)->default(0);  // PPH (pemotongan pajak)
            $table->decimal('ppn_amount', 16, 2)->default(0);  // PPN (pajak pertambahan nilai)
            $table->decimal('total_allocated', 16, 2)->default(0);
            $table->text('notes')->nullable();
            $table->string('status', 20)->default('draft');   // draft|submitted|approved|rejected
            $table->string('allocated_by', 256);              // AdminRegion email
            $table->string('reviewed_by', 256)->nullable();   // SuperAdmin email
            $table->timestamp('reviewed_at')->nullable();
            $table->text('review_note')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('order_cost_allocations');
        Schema::dropIfExists('transport_billings');
        Schema::dropIfExists('order_driver_assignments');
        Schema::dropIfExists('subsidy_quotas');
        Schema::dropIfExists('settings');
        Schema::dropIfExists('admin_credentials');
    }
};
