<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Counter atomik untuk generate PoNumber format GCS-{tahun}-{urutan}, urutan mulai dari 1
 * dan reset tiap tahun. Tabel ini dibaca/ditulis langsung lewat SQL (lintas bahasa/proyek)
 * karena order dibuat oleh sistem lain (lihat docs/ORDER_FLOW_CONTRACT.md untuk pola SQL
 * atomic increment-nya).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('order_code_counters', function (Blueprint $table) {
            $table->unsignedSmallInteger('year')->primary();
            $table->unsignedInteger('last_seq')->default(0);
            $table->timestamp('updated_at')->nullable();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('order_code_counters');
    }
};
