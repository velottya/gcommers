<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    private const VALID_REGIONS = [
        'Jawa Timur', 'Jawa Tengah Selatan', 'Jawa Tengah Utara',
        'Makassar', 'Medan', 'Lampung',
    ];

    public function up(): void
    {
        // Hapus tabel lama (urutan terbalik agar FK tidak konflik)
        Schema::dropIfExists('subsidy_quota_kiosk_allocations');
        Schema::dropIfExists('subsidy_quota_products');
        Schema::dropIfExists('subsidy_quota_submissions');
        Schema::dropIfExists('subsidy_quotas'); // tabel flat lama

        // ── 1. Header ajuan (satu per region per tahun) ──────────────────────────
        Schema::create('subsidy_quota_submissions', function (Blueprint $table) {
            $table->id();
            $table->string('region', 100);
            $table->unsignedInteger('year');                     // e.g. 2026
            $table->string('status', 20)->default('draft');     // draft|submitted|approved|rejected
            $table->text('notes')->nullable();
            $table->string('submitted_by', 256);                // email AdminRegion
            $table->string('reviewed_by', 256)->nullable();     // email SuperAdmin
            $table->timestamp('reviewed_at')->nullable();
            $table->text('review_note')->nullable();
            $table->timestamps();
            $table->unique(['region', 'year']);
        });

        $regions = implode("','", self::VALID_REGIONS);
        DB::statement("ALTER TABLE subsidy_quota_submissions ADD CONSTRAINT chk_sqs_region CHECK (region IN ('{$regions}'))");

        // ── 2. Baris produk dalam ajuan ──────────────────────────────────────────
        Schema::create('subsidy_quota_products', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('submission_id');
            $table->foreign('submission_id')
                  ->references('id')->on('subsidy_quota_submissions')
                  ->cascadeOnDelete();
            $table->unsignedBigInteger('product_id');
            $table->foreign('product_id')->references('id')->on('product_master');
            $table->string('product_code', 20);
            $table->string('product_name', 100);
            $table->decimal('total_qty_ton', 12, 2);
            $table->timestamps();
            $table->unique(['submission_id', 'product_id']);
        });

        // ── 3. Alokasi per kiosk dalam setiap baris produk ───────────────────────
        Schema::create('subsidy_quota_kiosk_allocations', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('quota_product_id');
            $table->foreign('quota_product_id')
                  ->references('id')->on('subsidy_quota_products')
                  ->cascadeOnDelete();
            $table->unsignedBigInteger('kiosk_id');             // loose FK → Users.Id
            $table->string('kiosk_name', 200);
            $table->string('kiosk_email', 256);
            $table->decimal('qty_ton', 12, 2);
            $table->timestamps();
            $table->unique(['quota_product_id', 'kiosk_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('subsidy_quota_kiosk_allocations');
        Schema::dropIfExists('subsidy_quota_products');
        Schema::dropIfExists('subsidy_quota_submissions');

        // Pulihkan tabel lama minimal
        Schema::create('subsidy_quotas', function (Blueprint $table) {
            $table->id();
            $table->string('region', 100);
            $table->string('kiosk_email', 256)->nullable();
            $table->string('product_code', 50)->nullable();
            $table->decimal('quota_kg', 12, 2);
            $table->decimal('used_kg', 12, 2)->default(0);
            $table->string('period', 7);
            $table->string('status', 20)->default('draft');
            $table->string('created_by', 256);
            $table->string('reviewed_by', 256)->nullable();
            $table->timestamp('reviewed_at')->nullable();
            $table->text('review_note')->nullable();
            $table->timestamps();
        });
    }
};
