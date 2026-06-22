<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TransportPartnerRate extends Model
{
    protected $table = 'transport_partner_rates';

    protected $fillable = [
        'region', 'company_name', 'shipping_cost_per_kg', 'set_by',
    ];

    protected function casts(): array
    {
        return [
            'shipping_cost_per_kg' => 'decimal:2',
        ];
    }
}
