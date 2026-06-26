<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Harga Produk (cost_rate_*) dan Alokasi Biaya Pengiriman (shipping_allocation_*)
 * sekarang 2 alur approval independen — harga produk untuk 1 kecamatan bisa
 * disetujui sebelum ongkir kecamatan itu sempat diatur, jadi biaya_pengiriman
 * di sini harus boleh kosong (transport_partner sudah nullable sejak sebelumnya).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('kecamatan_product_prices', function (Blueprint $table) {
            $table->decimal('biaya_pengiriman', 12, 2)->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('kecamatan_product_prices', function (Blueprint $table) {
            $table->decimal('biaya_pengiriman', 12, 2)->nullable(false)->change();
        });
    }
};
