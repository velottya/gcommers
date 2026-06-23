<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Ajuan gudang oleh AdminRegion, menunggu persetujuan SuperAdmin.
 * Berelasi ke tabel master wilayah yang sudah ada: region, propinsi, kabupaten, kecamatan.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('gudang_submissions', function (Blueprint $table) {
            $table->id();
            $table->string('nama_gudang', 200);
            $table->string('nama_pic', 150);
            $table->string('alamat_gudang', 500)->nullable();

            $table->unsignedInteger('region_id'); // region.id bertipe int
            $table->foreign('region_id')->references('id')->on('region');

            $table->unsignedBigInteger('propinsi_id');
            $table->foreign('propinsi_id')->references('id')->on('propinsi');

            $table->unsignedBigInteger('kabupaten_id');
            $table->foreign('kabupaten_id')->references('id')->on('kabupaten');

            $table->unsignedBigInteger('kecamatan_id');
            $table->foreign('kecamatan_id')->references('id')->on('kecamatan');

            $table->string('status', 20)->default('pending'); // pending|approved|rejected
            $table->string('submitted_by', 256);              // email AdminRegion
            $table->string('reviewed_by', 256)->nullable();   // email SuperAdmin
            $table->timestamp('reviewed_at')->nullable();
            $table->text('review_note')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('gudang_submissions');
    }
};
