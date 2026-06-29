<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * 1 pesanan kini bisa ditugaskan ke beberapa mitra transportir (lihat
 * order_transport_assignments) — `Shipments.CompanyName` dipakai untuk menyaring
 * slot truk milik perusahaan masing-masing dalam 1 pesanan yang sama, AdminTransport
 * tidak lagi bisa diidentifikasi cukup lewat `Orders.Vendor` saja.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('Shipments', function (Blueprint $table) {
            if (! Schema::hasColumn('Shipments', 'CompanyName')) {
                $table->string('CompanyName', 200)->nullable();
            }
        });
    }

    public function down(): void
    {
        Schema::table('Shipments', function (Blueprint $table) {
            if (Schema::hasColumn('Shipments', 'CompanyName')) {
                $table->dropColumn('CompanyName');
            }
        });
    }
};
