<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Alokasi Biaya Pengiriman kini dihitung per-kilo (bukan flat) dan menampilkan
 * kecamatan kiosk tujuan. Komponen PPN dihapus dari alur ini.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('order_cost_allocations', function (Blueprint $table) {
            $table->string('kecamatan', 150)->nullable()->after('region');
            $table->decimal('shipping_cost_per_kg', 16, 2)->default(0)->after('kecamatan');
        });

        Schema::table('order_cost_allocations', function (Blueprint $table) {
            $table->dropColumn(['shipping_cost', 'ppn_amount']);
        });
    }

    public function down(): void
    {
        Schema::table('order_cost_allocations', function (Blueprint $table) {
            $table->decimal('shipping_cost', 16, 2)->default(0);
            $table->decimal('ppn_amount', 16, 2)->default(0);
        });

        Schema::table('order_cost_allocations', function (Blueprint $table) {
            $table->dropColumn(['kecamatan', 'shipping_cost_per_kg']);
        });
    }
};
