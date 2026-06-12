<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('order_cost_allocations', function (Blueprint $table) {
            $table->id();
            $table->string('order_id', 255)->unique();
            $table->string('region', 255);
            $table->decimal('shipping_cost', 16, 2)->default(0);
            $table->decimal('pph_amount', 16, 2)->default(0);
            $table->decimal('ppn_amount', 16, 2)->default(0);
            $table->decimal('total_allocated', 16, 2)->default(0);
            $table->text('notes')->nullable();
            $table->string('status', 20)->default('draft');  // draft, submitted, approved, rejected
            $table->string('allocated_by', 255);
            $table->string('reviewed_by', 255)->nullable();
            $table->timestamp('reviewed_at')->nullable();
            $table->text('review_note')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('order_cost_allocations');
    }
};
