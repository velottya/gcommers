<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Tambah detail alamat kios. ProvinsiId/KabupatenId/KecamatanId sudah ada
 * sebelumnya di kolom Users (terisi konsisten dengan kolom legacy `Kecamatan`)
 * tapi belum punya FK formal — migration ini menambahkan relasinya.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('Users', function (Blueprint $table) {
            $table->string('Kelurahan', 150)->nullable();
            $table->string('KodePos', 10)->nullable();
            $table->decimal('Latitude', 10, 6)->nullable();
            $table->decimal('Longitude', 10, 6)->nullable();

            $table->foreign('ProvinsiId')->references('id')->on('propinsi')->nullOnDelete();
            $table->foreign('KabupatenId')->references('id')->on('kabupaten')->nullOnDelete();
            $table->foreign('KecamatanId')->references('id')->on('kecamatan')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('Users', function (Blueprint $table) {
            $table->dropForeign(['ProvinsiId']);
            $table->dropForeign(['KabupatenId']);
            $table->dropForeign(['KecamatanId']);
            $table->dropColumn(['Kelurahan', 'KodePos', 'Latitude', 'Longitude']);
        });
    }
};
