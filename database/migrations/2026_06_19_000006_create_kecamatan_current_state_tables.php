<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * "Current state" per kecamatan, di-upsert tiap kali ajuan terkait disetujui
 * SuperAdmin — supaya konsumen luar (mis. app Flutter) bisa baca harga/stok
 * terbaru tanpa perlu tahu soal workflow draft/submitted/approved.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('kecamatan_product_prices', function (Blueprint $table) {
            $table->id();
            $table->string('region', 100);
            $table->string('kecamatan', 150);
            $table->unsignedBigInteger('product_id');
            $table->foreign('product_id')->references('id')->on('product_master');
            $table->string('product_code', 20);
            $table->string('product_name', 100);
            $table->decimal('harga_satuan', 12, 2);
            $table->decimal('biaya_pengiriman', 12, 2);
            $table->decimal('pph_persen', 5, 2);
            $table->unsignedBigInteger('submission_id')->nullable();
            $table->foreign('submission_id')
                  ->references('id')->on('cost_rate_submissions')
                  ->nullOnDelete();
            $table->timestamp('approved_at')->nullable();
            $table->timestamps();
            $table->unique(['kecamatan', 'product_id']);
        });

        Schema::create('kecamatan_product_stocks', function (Blueprint $table) {
            $table->id();
            $table->string('region', 100);
            $table->string('kecamatan', 150);
            $table->unsignedBigInteger('product_id');
            $table->foreign('product_id')->references('id')->on('product_master');
            $table->string('product_code', 20);
            $table->string('product_name', 100);
            $table->string('period', 7);
            $table->decimal('quota_ton', 12, 2);
            $table->unsignedBigInteger('submission_id')->nullable();
            $table->foreign('submission_id')
                  ->references('id')->on('subsidy_quota_submissions')
                  ->nullOnDelete();
            $table->timestamp('approved_at')->nullable();
            $table->timestamps();
            $table->unique(['kecamatan', 'product_id', 'period']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('kecamatan_product_stocks');
        Schema::dropIfExists('kecamatan_product_prices');
    }
};
