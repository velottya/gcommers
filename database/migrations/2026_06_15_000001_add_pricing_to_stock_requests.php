<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Tambah kolom pricing ke product_stock_requests
        Schema::table('product_stock_requests', function (Blueprint $table) {
            $table->decimal('harga_satuan', 15, 2)->nullable()->after('qty_requested');
            $table->decimal('biaya_pengiriman', 15, 2)->nullable()->after('harga_satuan');
            $table->decimal('pajak_pph_persen', 5, 2)->nullable()->after('biaya_pengiriman');
            $table->decimal('pajak_ppn_persen', 5, 2)->nullable()->after('pajak_pph_persen');
        });

        // Tabel harga produk per region — diisi/diperbarui tiap kali ajuan disetujui
        Schema::create('product_region_prices', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('product_id');
            $table->string('product_name', 255);
            $table->string('product_code', 100)->nullable();
            $table->string('region', 100);
            $table->decimal('harga_satuan', 15, 2)->default(0);
            $table->decimal('biaya_pengiriman', 15, 2)->default(0);
            $table->decimal('pajak_pph_persen', 5, 2)->default(0.25);
            $table->decimal('pajak_ppn_persen', 5, 2)->default(11);
            $table->timestamp('effective_from')->nullable();
            $table->string('set_by', 256)->nullable();
            $table->timestamps();

            $table->unique(['product_id', 'region']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('product_region_prices');

        Schema::table('product_stock_requests', function (Blueprint $table) {
            $table->dropColumn(['harga_satuan', 'biaya_pengiriman', 'pajak_pph_persen', 'pajak_ppn_persen']);
        });
    }
};
