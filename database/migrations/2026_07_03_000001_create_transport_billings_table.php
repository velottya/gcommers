<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('transport_billings')) {
            return;
        }

        Schema::create('transport_billings', function (Blueprint $table) {
            $table->id();
            $table->string('company_name', 200);
            $table->string('period', 7);                     // YYYY-MM
            $table->unsignedInteger('total_orders')->default(0);
            $table->decimal('total_shipping', 16, 2)->default(0);
            $table->decimal('total_amount', 16, 2)->default(0);
            $table->string('status', 20)->default('draft');  // draft|submitted|approved|rejected
            $table->string('submitted_by', 256)->nullable();
            $table->string('reviewed_by', 256)->nullable();
            $table->timestamp('reviewed_at')->nullable();
            $table->text('note')->nullable();
            $table->timestamps();

            $table->unique(['company_name', 'period']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('transport_billings');
    }
};
