<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Alokasi biaya kini berupa tabel tarif (harga satuan, biaya pengiriman) per
 * produk x kecamatan, plus satu PPh % per region — bukan lagi per pesanan.
 */
return new class extends Migration
{
    private const VALID_REGIONS = [
        'Jawa Timur', 'Jawa Tengah Selatan', 'Jawa Tengah Utara',
        'Makassar', 'Medan', 'Lampung',
    ];

    public function up(): void
    {
        Schema::dropIfExists('order_cost_allocations');

        Schema::create('cost_rate_submissions', function (Blueprint $table) {
            $table->id();
            $table->string('region', 100);
            $table->decimal('pph_persen', 5, 2);
            $table->string('status', 20)->default('draft');
            $table->text('notes')->nullable();
            $table->string('submitted_by', 256);
            $table->string('reviewed_by', 256)->nullable();
            $table->timestamp('reviewed_at')->nullable();
            $table->text('review_note')->nullable();
            $table->timestamps();
        });

        $regions = implode("','", self::VALID_REGIONS);
        DB::statement("ALTER TABLE cost_rate_submissions ADD CONSTRAINT chk_crs_region CHECK (region IN ('{$regions}'))");

        Schema::create('cost_rate_items', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('submission_id');
            $table->foreign('submission_id')
                  ->references('id')->on('cost_rate_submissions')
                  ->cascadeOnDelete();
            $table->unsignedBigInteger('product_id');
            $table->foreign('product_id')->references('id')->on('product_master');
            $table->string('product_code', 20);
            $table->string('product_name', 100);
            $table->string('kecamatan', 150);
            $table->decimal('harga_satuan', 12, 2);
            $table->decimal('biaya_pengiriman', 12, 2);
            $table->timestamps();
            $table->unique(['submission_id', 'product_id', 'kecamatan']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cost_rate_items');
        Schema::dropIfExists('cost_rate_submissions');

        Schema::create('order_cost_allocations', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('order_id')->unique();
            $table->string('region', 100);
            $table->string('kecamatan', 150)->nullable();
            $table->decimal('shipping_cost_per_kg', 16, 2)->default(0);
            $table->decimal('pph_amount', 16, 2);
            $table->decimal('total_allocated', 16, 2);
            $table->text('notes')->nullable();
            $table->string('status', 20)->default('draft');
            $table->string('allocated_by', 256);
            $table->string('reviewed_by', 256)->nullable();
            $table->timestamp('reviewed_at')->nullable();
            $table->text('review_note')->nullable();
            $table->timestamps();
        });
    }
};
