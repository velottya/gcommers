<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Referensi gudang ("nearest gudang") yang dipilih AdminTransport saat alokasi sopir.
 * Sengaja sederhana: satu region/company bisa punya lebih dari satu gudang.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('warehouses', function (Blueprint $table) {
            $table->id();
            $table->string('region', 100);                 // selaras Users.Region
            $table->string('company_name', 200)->nullable(); // selaras Users.CompanyName (AdminTransport); null = gudang region, lintas perusahaan
            $table->string('name', 200);
            $table->string('address', 500)->nullable();
            $table->decimal('lat', 10, 6)->nullable();
            $table->decimal('lng', 10, 6)->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        DB::table('warehouses')->insert([
            [
                'region' => 'Jawa Timur', 'company_name' => 'PT Global Logistik Nusantara',
                'name' => 'Gudang Surabaya', 'address' => 'Jl. Margomulyo, Surabaya',
                'lat' => -7.257500, 'lng' => 112.752100, 'is_active' => true,
                'created_at' => now(), 'updated_at' => now(),
            ],
            [
                'region' => 'Lampung', 'company_name' => 'PT Global Logistik Nusantara',
                'name' => 'Gudang Bandar Lampung', 'address' => 'Jl. Soekarno-Hatta, Bandar Lampung',
                'lat' => -5.450000, 'lng' => 105.266700, 'is_active' => true,
                'created_at' => now(), 'updated_at' => now(),
            ],
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('warehouses');
    }
};
