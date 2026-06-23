<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Order extends Model
{
    protected $table      = 'Orders';
    protected $primaryKey = 'Id';
    public    $timestamps = false;

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

    public function shipment()
    {
        return $this->hasOne(Shipment::class, 'OrderId', 'Id');
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

        if ($this->relationLoaded('shipment') && $this->shipment) {
            return match ($this->shipment->Status) {
                Shipment::STATUS_SIAP_MUAT, Shipment::STATUS_DALAM_PERJALANAN => $this->shipment->Status === Shipment::STATUS_DALAM_PERJALANAN ? 'shipping' : 'processing',
                Shipment::STATUS_SELESAI => 'delivered',
                default => null,
            };
        }

        return $this->PaidAt ? 'processing' : null;
    }
}
