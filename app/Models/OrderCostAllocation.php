<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class OrderCostAllocation extends Model
{
    protected $table    = 'order_cost_allocations';
    protected $fillable = [
        'order_id', 'region', 'kecamatan', 'shipping_cost_per_kg', 'pph_amount',
        'total_allocated', 'notes', 'status', 'allocated_by',
        'reviewed_by', 'reviewed_at', 'review_note',
    ];

    protected $casts = [
        'reviewed_at'          => 'datetime',
        'shipping_cost_per_kg' => 'decimal:2',
        'pph_amount'           => 'decimal:2',
        'total_allocated'      => 'decimal:2',
    ];
}
