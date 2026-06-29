<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class OrderTransportAssignment extends Model
{
    protected $table = 'order_transport_assignments';

    protected $fillable = [
        'order_id',
        'product_id',
        'product_code',
        'product_name',
        'company_name',
        'quota_ton',
        'assigned_by',
    ];

    protected $casts = [
        'quota_ton' => 'decimal:2',
    ];

    public function order()
    {
        return $this->belongsTo(Order::class, 'order_id', 'Id');
    }
}
