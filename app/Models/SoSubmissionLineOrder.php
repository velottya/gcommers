<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SoSubmissionLineOrder extends Model
{
    protected $table = 'so_submission_line_orders';

    protected $fillable = [
        'line_id', 'order_id', 'product_id', 'quantity',
    ];

    protected $casts = [
        'quantity' => 'decimal:2',
    ];

    public function line(): BelongsTo
    {
        return $this->belongsTo(SoSubmissionLine::class, 'line_id');
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class, 'order_id', 'Id');
    }
}
