<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Order extends Model
{
    protected $table      = 'Orders';
    protected $primaryKey = 'Id';
    public    $timestamps = false;

    /**
     * Admin console hampir selalu hanya membaca Orders (baris dibuat oleh
     * Flutter/backend pemesanan — lihat docs/ORDER_FLOW_CONTRACT.md) — kolom
     * di bawah ini satu-satunya yang boleh ditulis dari sisi admin console.
     */
    protected $fillable = [
        'OrderStatus',
        'OrderStatusNote',
        'GudangSubmissionId',
        'ResiNomor',
        'ShippingType',
    ];

    protected $casts = [
        'CreatedAt'      => 'datetime',
        'UpdatedAt'      => 'datetime',
        'PaidAt'         => 'datetime',
        'DeliveredAt'    => 'datetime',
        'VaExpiredAt'    => 'datetime',
        'Subtotal'       => 'decimal:2',
        'TaxAmount'      => 'decimal:2',
        'ShippingAmount' => 'decimal:2',
        'TotalAmount'    => 'decimal:2',
    ];

    public function items()
    {
        return $this->hasMany(OrderItem::class, 'OrderId', 'Id');
    }

    public function events()
    {
        return $this->hasMany(OrderEvent::class, 'OrderId', 'Id');
    }

    /**
     * Satu order bisa punya lebih dari satu truk (Pengiriman Parsial, maks. 5),
     * masing-masing baris Shipments adalah satu "slot" truk — lihat SlotIndex.
     */
    public function shipments()
    {
        return $this->hasMany(Shipment::class, 'OrderId', 'Id')->orderBy('SlotIndex');
    }

    public function gudangSubmission()
    {
        return $this->belongsTo(GudangSubmission::class, 'GudangSubmissionId');
    }

    /**
     * 2 status pembayaran: pending | paid. Diturunkan dari PaidAt, bukan kolom
     * tersendiri, supaya tidak ada dua sumber kebenaran yang bisa tidak sinkron.
     */
    public function getPaymentStatusAttribute(): string
    {
        return $this->PaidAt ? 'paid' : 'pending';
    }

    /**
     * 4 status pemesanan (hanya berarti setelah PaymentStatus = paid):
     * processing | shipping | delivered | cancelled.
     *
     * Diutamakan dari kolom OrderStatus. Jika belum diisi oleh sistem yang membuat
     * order (mis. saat fitur ini baru diadopsi di sisi Flutter), turunkan dari
     * Shipment terkait, lalu fallback ke PaidAt, supaya tampilan tetap benar.
     */
    public function getEffectiveOrderStatusAttribute(): ?string
    {
        if ($this->OrderStatus) {
            return $this->OrderStatus;
        }

        if ($this->relationLoaded('shipments') && $this->shipments->isNotEmpty()) {
            $statuses = $this->shipments->pluck('Status');

            if ($statuses->contains(Shipment::STATUS_DALAM_PERJALANAN)) {
                return 'shipping';
            }

            if ($statuses->every(fn ($s) => $s === Shipment::STATUS_SELESAI)) {
                return 'delivered';
            }

            return 'processing';
        }

        return $this->PaidAt ? 'processing' : null;
    }

    /**
     * Kode resi 10 karakter: huruf G + 9 digit acak (mis. G288899912). Tidak ada
     * unique index DB-level (lihat migration) — keunikan dijamin di sini lewat
     * pengecekan ulang sebelum dipakai.
     */
    public static function generateResiNomor(): string
    {
        do {
            $candidate = 'G' . str_pad((string) random_int(0, 999999999), 9, '0', STR_PAD_LEFT);
        } while (self::where('ResiNomor', $candidate)->exists());

        return $candidate;
    }
}
