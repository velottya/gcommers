<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TransportBilling extends Model
{
    protected $table    = 'transport_billings';
    protected $fillable = [
        'company_name', 'period', 'total_orders', 'total_shipping',
        'total_amount', 'status', 'submitted_by', 'reviewed_by', 'reviewed_at', 'note',
    ];

    protected $casts = [
        'reviewed_at'    => 'datetime',
        'total_orders'   => 'integer',
        'total_shipping' => 'decimal:2',
        'total_amount'   => 'decimal:2',
    ];
}
