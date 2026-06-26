<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * transport_partner/biaya_pengiriman sudah dipindahkan ke shipping_allocation_items
 * (lihat migration sebelumnya) -- cost_rate_items sekarang murni harga satuan
 * produk per kecamatan, lepas dari mitra pengiriman.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('cost_rate_items', function (Blueprint $table) {
            $table->dropColumn(['transport_partner', 'biaya_pengiriman']);
        });
    }

    public function down(): void
    {
        Schema::table('cost_rate_items', function (Blueprint $table) {
            $table->string('transport_partner', 200)->nullable();
            $table->decimal('biaya_pengiriman', 12, 2)->nullable();
        });
    }
};
