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
}
