<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class KecamatanShippingRate extends Model
{
    protected $table = 'kecamatan_shipping_rates';

    protected $fillable = [
        'region', 'kecamatan', 'transport_partner', 'biaya_pengiriman', 'submission_id', 'approved_at',
    ];

    protected function casts(): array
    {
        return [
            'biaya_pengiriman' => 'decimal:2',
            'approved_at'      => 'datetime',
        ];
    }

    public function submission(): BelongsTo
    {
        return $this->belongsTo(ShippingAllocationSubmission::class, 'submission_id');
    }
}
