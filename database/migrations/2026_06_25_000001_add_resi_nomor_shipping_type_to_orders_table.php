<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Tabel `Orders` dipakai bersama Flutter app (lihat docs/ORDER_FLOW_CONTRACT.md) —
 * migration ini HANYA menambah kolom baru (nullable), tidak mengubah kolom yang sudah ada.
 *
 * - ResiNomor: kode resi 10 karakter (huruf G + 9 digit acak), digenerate admin
 *   console saat AdminRegion mengatur Pengiriman untuk order ini. Tidak diberi
 *   unique index DB-level karena SQL Server menolak >1 NULL pada unique index
 *   biasa (semua order lama NULL) — keunikan dijamin di level aplikasi (cek
 *   sebelum simpan saat generate).
 * - ShippingType: 'parsial' | 'penuh', diisi bersamaan dengan ResiNomor.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('Orders', function (Blueprint $table) {
            if (! Schema::hasColumn('Orders', 'ResiNomor')) {
                $table->string('ResiNomor', 10)->nullable()->after('PoNumber');
            }
            if (! Schema::hasColumn('Orders', 'ShippingType')) {
                $table->string('ShippingType', 20)->nullable();
            }
        });
    }

    public function down(): void
    {
        Schema::table('Orders', function (Blueprint $table) {
            if (Schema::hasColumn('Orders', 'ResiNomor')) {
                $table->dropColumn('ResiNomor');
            }
            if (Schema::hasColumn('Orders', 'ShippingType')) {
                $table->dropColumn('ShippingType');
            }
        });
    }
};
