<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * SuperAdmin bisa menyetujui/menolak ajuan secara sebagian (per baris kecamatan
 * / per baris tarif), bukan hanya seluruh ajuan sekaligus.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('subsidy_quota_kecamatan_allocations', function (Blueprint $table) {
            $table->string('status', 20)->default('pending')->after('qty_ton');
        });

        Schema::table('cost_rate_items', function (Blueprint $table) {
            $table->string('status', 20)->default('pending')->after('biaya_pengiriman');
        });
    }

    public function down(): void
    {
        Schema::table('subsidy_quota_kecamatan_allocations', function (Blueprint $table) {
            $table->dropColumn('status');
        });

        Schema::table('cost_rate_items', function (Blueprint $table) {
            $table->dropColumn('status');
        });
    }
};
