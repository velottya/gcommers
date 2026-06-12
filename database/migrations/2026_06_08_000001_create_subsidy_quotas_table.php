<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('subsidy_quotas', function (Blueprint $table) {
            $table->id();
            $table->string('region', 255);
            $table->string('kiosk_email', 255)->nullable();
            $table->string('product_code', 100)->nullable();
            $table->decimal('quota_kg', 12, 2);
            $table->string('period', 7);      // "2026-06"
            $table->string('status', 20)->default('active');   // active, suspended
            $table->string('created_by', 255);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('subsidy_quotas');
    }
};
