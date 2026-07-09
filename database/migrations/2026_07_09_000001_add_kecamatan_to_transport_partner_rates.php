<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Tarif transportir kini bisa diatur per-kecamatan, bukan cuma per-region.
 * kecamatan_id NULL berarti baris tarif "default" untuk region tsb (dipakai
 * sebagai fallback ketika kecamatan tujuan belum diatur tarif khususnya) —
 * baris lama (semua kecamatan_id NULL) otomatis jadi default tanpa migrasi data.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('transport_partner_rates', function (Blueprint $table) {
            $table->unsignedBigInteger('kecamatan_id')->nullable()->after('company_name');
            $table->foreign('kecamatan_id')->references('id')->on('kecamatan');
        });

        Schema::table('transport_partner_rates', function (Blueprint $table) {
            $table->dropUnique(['region', 'company_name']);
            $table->unique(['region', 'company_name', 'kecamatan_id']);
        });
    }

    public function down(): void
    {
        Schema::table('transport_partner_rates', function (Blueprint $table) {
            $table->dropUnique(['region', 'company_name', 'kecamatan_id']);
        });

        Schema::table('transport_partner_rates', function (Blueprint $table) {
            $table->dropForeign(['kecamatan_id']);
            $table->dropColumn('kecamatan_id');
        });

        Schema::table('transport_partner_rates', function (Blueprint $table) {
            $table->unique(['region', 'company_name']);
        });
    }
};
