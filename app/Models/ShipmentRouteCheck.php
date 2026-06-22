<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ShipmentRouteCheck extends Model
{
    protected $table      = 'ShipmentRouteChecks';
    protected $primaryKey = 'Id';
    public    $timestamps = false;

    protected $casts = [
        'CreatedAt'              => 'datetime',
        'ExpectedDistanceMeters' => 'decimal:2',
        'ActualDistanceMeters'   => 'decimal:2',
        'DistanceDiffMeters'     => 'decimal:2',
    ];

    public function shipment()
    {
        return $this->belongsTo(Shipment::class, 'ShipmentId', 'Id');
    }
}
