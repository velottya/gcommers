<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Order extends Model
{
    protected $table = 'Orders';
    protected $primaryKey = 'id';
    public $timestamps = false;

    protected $casts = [
        'createdAt'    => 'datetime',
        'updatedAt'    => 'datetime',
        'paidAt'       => 'datetime',
        'deliveredAt'  => 'datetime',
        'vaExpiredAt'  => 'datetime',
        'subTotal'     => 'decimal:2',
        'taxAmount'    => 'decimal:2',
        'shippingAmount' => 'decimal:2',
        'totalAmount'  => 'decimal:2',
    ];

    public function items()
    {
        // kolom FK di OrderItems diasumsikan 'orderId' — sesuaikan jika berbeda
        return $this->hasMany(OrderItem::class, 'orderId', 'id');
    }

    public function events()
    {
        // kolom FK di OrderEvents diasumsikan 'orderId' — sesuaikan jika berbeda
        return $this->hasMany(OrderEvent::class, 'orderId', 'id');
    }
}
