<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * AdminRegion sekarang bisa menugaskan lebih dari 1 mitra transportir per pesanan,
 * dengan alokasi per produk (qty 1 produk boleh dipecah ke beberapa mitra). Ini
 * menggantikan pemilihan 1 `Orders.Vendor` untuk seluruh pesanan (lihat
 * docs/ORDER_FLOW_CONTRACT.md) — kolom `Vendor` dibiarkan ada tapi tidak lagi
 * ditulis/dibaca admin console untuk keperluan ini.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('order_transport_assignments', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('order_id'); // FK loose → Orders.Id
            $table->unsignedBigInteger('product_id');
            $table->string('product_code', 20)->nullable();
            $table->string('product_name', 150)->nullable();
            $table->string('company_name', 200);
            $table->decimal('quota_ton', 12, 2);
            $table->string('assigned_by', 256);
            $table->timestamps();
            $table->index(['order_id', 'product_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('order_transport_assignments');
    }
};
