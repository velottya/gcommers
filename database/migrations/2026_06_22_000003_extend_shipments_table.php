<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Tabel `Shipments` & `ShipmentRouteChecks` SUDAH ADA di database (dibuat di luar migration
 * Laravel ini, sudah punya FK ke Orders) — dipakai sebagai dasar tracking pengiriman
 * (load-in/load-out, status siap_muat|dalam_perjalanan|selesai). Migration ini HANYA
 * menambah kolom yang masih kurang, tidak membuat ulang/mengubah kolom yang sudah ada.
 *
 * Lihat docs/ORDER_FLOW_CONTRACT.md untuk kontrak penuh siapa menulis kolom apa & kapan.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('Shipments', function (Blueprint $table) {
            if (! Schema::hasColumn('Shipments', 'WarehouseId')) {
                $table->unsignedBigInteger('WarehouseId')->nullable()->after('OrderId');
                $table->foreign('WarehouseId')->references('id')->on('warehouses')->nullOnDelete();
            }
            if (! Schema::hasColumn('Shipments', 'MuatInPhotoUrl')) {
                $table->string('MuatInPhotoUrl', 500)->nullable()->after('MuatInCompletedAt');
            }
            if (! Schema::hasColumn('Shipments', 'MuatOutPhotoUrl')) {
                $table->string('MuatOutPhotoUrl', 500)->nullable()->after('MuatOutCompletedAt');
            }
            if (! Schema::hasColumn('Shipments', 'Note')) {
                $table->string('Note', 500)->nullable();
            }
            if (! Schema::hasColumn('Shipments', 'AssignedBy')) {
                $table->string('AssignedBy', 256)->nullable(); // email AdminTransport yang mengalokasikan
            }
        });
    }

    public function down(): void
    {
        Schema::table('Shipments', function (Blueprint $table) {
            if (Schema::hasColumn('Shipments', 'WarehouseId')) {
                $table->dropForeign(['WarehouseId']);
                $table->dropColumn('WarehouseId');
            }
            foreach (['MuatInPhotoUrl', 'MuatOutPhotoUrl', 'Note', 'AssignedBy'] as $col) {
                if (Schema::hasColumn('Shipments', $col)) {
                    $table->dropColumn($col);
                }
            }
        });
    }
};
