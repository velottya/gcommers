<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('settings', function (Blueprint $table) {
            $table->id();
            $table->string('key', 100)->unique();
            $table->text('value')->nullable();
            $table->string('label', 255)->nullable();
            $table->string('unit', 50)->nullable();
            $table->timestamps();
        });

        DB::table('settings')->insert([
            ['key' => 'biaya_pengiriman_dasar',  'label' => 'Biaya Pengiriman Dasar',  'unit' => 'IDR',     'value' => '10000',  'created_at' => now(), 'updated_at' => now()],
            ['key' => 'biaya_pengiriman_per_km',  'label' => 'Biaya Pengiriman per Km', 'unit' => 'IDR/km',  'value' => '2000',   'created_at' => now(), 'updated_at' => now()],
            ['key' => 'pph_persen',               'label' => 'Tarif PPH',               'unit' => '%',       'value' => '0.25',   'created_at' => now(), 'updated_at' => now()],
            ['key' => 'ppn_persen',               'label' => 'Tarif PPN',               'unit' => '%',       'value' => '11',     'created_at' => now(), 'updated_at' => now()],
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('settings');
    }
};
