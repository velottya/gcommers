<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('order_driver_assignments', function (Blueprint $table) {
            $table->id();
            $table->string('order_id', 255);
            $table->string('transportir_email', 255);
            $table->string('assigned_by', 255);
            $table->text('note')->nullable();
            $table->timestamps();

            $table->unique('order_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('order_driver_assignments');
    }
};
