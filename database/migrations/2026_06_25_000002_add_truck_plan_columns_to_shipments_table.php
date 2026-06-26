<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Tabel `Shipments` dipakai bersama Flutter app (lihat docs/ORDER_FLOW_CONTRACT.md) —
 * migration ini HANYA menambah kolom baru (nullable), tidak mengubah kolom yang sudah ada.
 *
 * Satu order sekarang bisa punya lebih dari satu baris Shipments (maks. 5, untuk
 * "Pengiriman Parsial" lintas truk) — sudah dipastikan aman karena Shipments.OrderId
 * tidak punya unique constraint. Kolom baru ini menyimpan rencana muatan per truk,
 * diisi AdminRegion saat mengatur Pengiriman, sebelum AdminTransport mengalokasikan
 * truk/sopir ke baris ini.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('Shipments', function (Blueprint $table) {
            if (! Schema::hasColumn('Shipments', 'ProductName')) {
                $table->string('ProductName', 200)->nullable();
            }
            if (! Schema::hasColumn('Shipments', 'QuotaTon')) {
                $table->decimal('QuotaTon', 10, 2)->nullable();
            }
            if (! Schema::hasColumn('Shipments', 'SlotIndex')) {
                $table->unsignedTinyInteger('SlotIndex')->nullable();
            }
        });
    }

    public function down(): void
    {
        Schema::table('Shipments', function (Blueprint $table) {
            foreach (['ProductName', 'QuotaTon', 'SlotIndex'] as $col) {
                if (Schema::hasColumn('Shipments', $col)) {
                    $table->dropColumn($col);
                }
            }
        });
    }
};
