<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Alokasi quota subsidi kini per kecamatan, bukan per kiosk individual.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::dropIfExists('subsidy_quota_kiosk_allocations');

        Schema::create('subsidy_quota_kecamatan_allocations', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('quota_product_id');
            $table->foreign('quota_product_id')
                  ->references('id')->on('subsidy_quota_products')
                  ->cascadeOnDelete();
            $table->string('kecamatan', 150);
            $table->decimal('qty_ton', 12, 2);
            $table->timestamps();
            $table->unique(['quota_product_id', 'kecamatan']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('subsidy_quota_kecamatan_allocations');

        Schema::create('subsidy_quota_kiosk_allocations', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('quota_product_id');
            $table->foreign('quota_product_id')
                  ->references('id')->on('subsidy_quota_products')
                  ->cascadeOnDelete();
            $table->unsignedBigInteger('kiosk_id');
            $table->string('kiosk_name', 200);
            $table->string('kiosk_email', 256);
            $table->decimal('qty_ton', 12, 2);
            $table->timestamps();
            $table->unique(['quota_product_id', 'kiosk_id']);
        });
    }
};
