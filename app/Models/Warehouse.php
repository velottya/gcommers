<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Warehouse extends Model
{
    protected $table = 'warehouses';

    protected $fillable = [
        'region',
        'company_name',
        'name',
        'address',
        'lat',
        'lng',
        'is_active',
    ];

    protected $casts = [
        'lat'       => 'decimal:6',
        'lng'       => 'decimal:6',
        'is_active' => 'boolean',
    ];

    public function shipments()
    {
        return $this->hasMany(Shipment::class, 'WarehouseId');
    }
}
