<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * `warehouses` digantikan oleh `gudang_submissions` (ajuan AdminRegion + persetujuan
 * SuperAdmin) sebagai satu-satunya sumber data gudang. Shipments.WarehouseId direpoint
 * ke gudang_submissions sebelum tabel lama dihapus.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('Shipments', function (Blueprint $table) {
            $table->dropForeign(['WarehouseId']);
        });

        // WarehouseId lama mengacu ke id-space tabel warehouses, tidak berkorespondensi
        // dengan id gudang_submissions — kosongkan dulu agar FK baru tidak gagal dibuat.
        DB::table('Shipments')->whereNotNull('WarehouseId')->update(['WarehouseId' => null]);

        Schema::table('Shipments', function (Blueprint $table) {
            $table->foreign('WarehouseId')->references('id')->on('gudang_submissions')->nullOnDelete();
        });

        Schema::dropIfExists('warehouses');
    }

    public function down(): void
    {
        Schema::create('warehouses', function (Blueprint $table) {
            $table->id();
            $table->string('region', 100);
            $table->string('company_name', 200)->nullable();
            $table->string('name', 200);
            $table->string('address', 500)->nullable();
            $table->decimal('lat', 10, 6)->nullable();
            $table->decimal('lng', 10, 6)->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::table('Shipments', function (Blueprint $table) {
            $table->dropForeign(['WarehouseId']);
        });

        DB::table('Shipments')->whereNotNull('WarehouseId')->update(['WarehouseId' => null]);

        Schema::table('Shipments', function (Blueprint $table) {
            $table->foreign('WarehouseId')->references('id')->on('warehouses')->nullOnDelete();
        });
    }
};
