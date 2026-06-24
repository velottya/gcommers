<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Wilayah kerja AdminTransport: satu akun bisa mencakup banyak kecamatan.
 * user_id sengaja tanpa FK formal ke Users (ikuti pola admin_credentials.user_id)
 * karena tabel Users dikelola bersama proyek Flutter.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('user_kecamatans', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('user_id'); // FK loose → dbo.Users.Id
            $table->unsignedBigInteger('kecamatan_id');
            $table->foreign('kecamatan_id')->references('id')->on('kecamatan');
            $table->timestamps();
            $table->unique(['user_id', 'kecamatan_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_kecamatans');
    }
};
