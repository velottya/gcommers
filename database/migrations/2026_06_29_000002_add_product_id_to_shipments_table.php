<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Tabel `Shipments` dipakai bersama Flutter app (lihat docs/ORDER_FLOW_CONTRACT.md) —
 * migration ini HANYA menambah kolom baru (nullable), tidak mengubah kolom yang sudah ada.
 *
 * `Shipments.ProductCode`/`ProductName` (ditambah migration sebelumnya) cukup untuk
 * tampilan, tapi mencocokkan slot truk ke baris `OrderItems` (yang kuncinya
 * `ProductId`, bukan kode produk) butuh kolom ini supaya alokasi per produk
 * (Alokasi Sopir, beberapa truk per order) bisa divalidasi tanpa join ke
 * `product_master` tiap kali.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('Shipments', function (Blueprint $table) {
            if (! Schema::hasColumn('Shipments', 'ProductId')) {
                $table->unsignedBigInteger('ProductId')->nullable();
            }
        });
    }

    public function down(): void
    {
        Schema::table('Shipments', function (Blueprint $table) {
            if (Schema::hasColumn('Shipments', 'ProductId')) {
                $table->dropColumn('ProductId');
            }
        });
    }
};
