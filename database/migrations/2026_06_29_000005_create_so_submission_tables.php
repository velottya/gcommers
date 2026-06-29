<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Pengajuan SO (Sales Order) — menggantikan fitur "Pilih Gudang per pesanan".
 * AdminRegion merekap pesanan yang sudah dibayar & belum ber-SO, dikelompokkan per
 * (kecamatan, produk) — 1 kombinasi = 1 baris SO. SuperAdmin meninjau, mengisi kode
 * SO + memilih gudang aktif (boleh >1) per baris.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('so_submissions', function (Blueprint $table) {
            $table->id();
            $table->string('region', 100);
            $table->string('status', 20)->default('submitted');
            $table->string('submitted_by', 256);
            $table->string('reviewed_by', 256)->nullable();
            $table->timestamp('reviewed_at')->nullable();
            $table->text('review_note')->nullable();
            $table->timestamps();
        });

        Schema::create('so_submission_lines', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('submission_id');
            $table->foreign('submission_id')->references('id')->on('so_submissions')->cascadeOnDelete();
            $table->unsignedBigInteger('kecamatan_id');
            $table->foreign('kecamatan_id')->references('id')->on('kecamatan');
            $table->unsignedBigInteger('kabupaten_id')->nullable();
            $table->unsignedBigInteger('product_id');
            $table->string('product_code', 20)->nullable();
            $table->string('product_name', 150)->nullable();
            $table->string('unit', 20)->nullable();
            $table->decimal('total_quantity', 12, 2);
            $table->string('so_code', 100)->nullable();
            $table->string('status', 20)->default('pending');
            $table->string('reviewed_by', 256)->nullable();
            $table->timestamp('reviewed_at')->nullable();
            $table->text('review_note')->nullable();
            $table->timestamps();
            $table->unique(['submission_id', 'kecamatan_id', 'product_id']);
        });

        Schema::create('so_submission_line_gudangs', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('line_id');
            $table->foreign('line_id')->references('id')->on('so_submission_lines')->cascadeOnDelete();
            $table->unsignedBigInteger('gudang_submission_id');
            $table->foreign('gudang_submission_id')->references('id')->on('gudang_submissions');
            $table->timestamps();
            $table->unique(['line_id', 'gudang_submission_id']);
        });

        Schema::create('so_submission_line_orders', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('line_id');
            $table->foreign('line_id')->references('id')->on('so_submission_lines')->cascadeOnDelete();
            $table->unsignedBigInteger('order_id'); // FK loose → Orders.Id
            $table->unsignedBigInteger('product_id');
            $table->decimal('quantity', 12, 2);
            $table->timestamps();
            $table->index(['order_id', 'product_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('so_submission_line_orders');
        Schema::dropIfExists('so_submission_line_gudangs');
        Schema::dropIfExists('so_submission_lines');
        Schema::dropIfExists('so_submissions');
    }
};
