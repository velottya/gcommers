<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Tabel `Shipments` dipakai bersama Flutter app (lihat docs/ORDER_FLOW_CONTRACT.md) —
 * migration ini HANYA menambah kolom baru (nullable), tidak mengubah kolom yang sudah ada.
 *
 * ProductCode: kode produk (dari Products.ProductCode) untuk muatan truk ini,
 * dipilih AdminRegion dari item order yang sebenarnya saat mengatur Pengiriman —
 * dipakai supaya surat jalan bisa menampilkan kode produk di URAIAN BARANG.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('Shipments', function (Blueprint $table) {
            if (! Schema::hasColumn('Shipments', 'ProductCode')) {
                $table->string('ProductCode', 50)->nullable();
            }
        });
    }

    public function down(): void
    {
        Schema::table('Shipments', function (Blueprint $table) {
            if (Schema::hasColumn('Shipments', 'ProductCode')) {
                $table->dropColumn('ProductCode');
            }
        });
    }
};
