<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Ajuan penambahan stok dari AdminRegion ke SuperAdmin.
        // Alur: AdminRegion submit → SuperAdmin approve (Stock bertambah) / reject.
        Schema::create('product_stock_requests', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('product_id');           // FK loose → Products.Id
            $table->string('product_name', 255);                // denormalisasi agar riwayat tetap readable
            $table->string('product_code', 100)->nullable();    // denormalisasi
            $table->string('region', 100);                      // matches Users.Region of AdminRegion
            $table->integer('qty_requested');                   // jumlah stok yang diajukan untuk ditambah
            $table->text('notes')->nullable();
            $table->string('status', 20)->default('submitted'); // submitted|approved|rejected
            $table->string('requested_by', 256);                // AdminRegion email
            $table->string('reviewed_by', 256)->nullable();     // SuperAdmin email
            $table->timestamp('reviewed_at')->nullable();
            $table->text('review_note')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('product_stock_requests');
    }
};
