<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ShippingAllocationItem extends Model
{
    protected $table = 'shipping_allocation_items';

    protected $fillable = [
        'submission_id', 'kecamatan', 'transport_partner', 'biaya_pengiriman', 'status',
    ];

    protected function casts(): array
    {
        return [
            'biaya_pengiriman' => 'decimal:2',
        ];
    }

    public function submission(): BelongsTo
    {
        return $this->belongsTo(ShippingAllocationSubmission::class, 'submission_id');
    }
}
