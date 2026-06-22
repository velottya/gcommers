<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Orders.Status (legacy, dimiliki bersama proyek Flutter) tetap dipertahankan apa adanya.
 * OrderStatus baru ini adalah field tambahan yang memisahkan "progres pemesanan" dari
 * status pembayaran (PaymentStatus diturunkan dari Orders.PaidAt, tidak perlu kolom baru).
 *
 * Nilai OrderStatus: processing | shipping | delivered | cancelled (NULL = belum dibayar).
 * Lihat docs/ORDER_FLOW_CONTRACT.md untuk kontrak lengkap lintas proyek.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('Orders', 'OrderStatus')) {
            Schema::table('Orders', function (Blueprint $table) {
                $table->string('OrderStatus', 20)->nullable()->after('Status');
                $table->string('OrderStatusNote', 500)->nullable()->after('OrderStatus');
            });
        }

        // Backfill dari kolom Status lama agar data yang sudah ada langsung konsisten.
        DB::table('Orders')->where('Status', 'paid')->update(['OrderStatus' => 'processing']);
        DB::table('Orders')->whereIn('Status', ['shipping', 'on_delivery'])->update(['OrderStatus' => 'shipping']);
        DB::table('Orders')->whereIn('Status', ['delivered', 'completed'])->update(['OrderStatus' => 'delivered']);
        DB::table('Orders')->where('Status', 'cancelled')->update(['OrderStatus' => 'cancelled']);
    }

    public function down(): void
    {
        if (Schema::hasColumn('Orders', 'OrderStatus')) {
            Schema::table('Orders', function (Blueprint $table) {
                $table->dropColumn(['OrderStatus', 'OrderStatusNote']);
            });
        }
    }
};
