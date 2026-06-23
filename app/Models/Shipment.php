<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Tabel `Shipments` sudah ada di DB sebelum proyek admin console ini menyentuhnya
 * (dibuat di luar migration Laravel, sudah punya FK ke Orders). Model ini hanya
 * memetakan kolom yang sudah dikonfirmasi ada — lihat docs/ORDER_FLOW_CONTRACT.md.
 *
 * Status: siap_muat (sopir dialokasikan) -> dalam_perjalanan (foto load-in diupload)
 *         -> selesai (foto load-out diupload).
 */
class Shipment extends Model
{
    protected $table      = 'Shipments';
    protected $primaryKey = 'Id';
    public    $timestamps = false;

    public const STATUS_SIAP_MUAT       = 'siap_muat';
    public const STATUS_DALAM_PERJALANAN = 'dalam_perjalanan';
    public const STATUS_SELESAI         = 'selesai';

    protected $fillable = [
        'ShipmentNumber',
        'OrderId',
        'WarehouseId',
        'DriverName',
        'TransportirEmail',
        'TruckLabel',
        'PoliceNumber',
        'DestinationLabel',
        'DestinationAddress',
        'OriginLat',
        'OriginLng',
        'DestinationLat',
        'DestinationLng',
        'Status',
        'Note',
        'AssignedBy',
    ];

    protected $casts = [
        'CreatedAt'           => 'datetime',
        'UpdatedAt'           => 'datetime',
        'MuatInCompletedAt'   => 'datetime',
        'MuatOutCompletedAt'  => 'datetime',
        'CompletedAt'         => 'datetime',
        'TotalDistanceMeters' => 'decimal:2',
        'OriginLat'           => 'decimal:6',
        'OriginLng'           => 'decimal:6',
        'DestinationLat'      => 'decimal:6',
        'DestinationLng'      => 'decimal:6',
    ];

    public function order()
    {
        return $this->belongsTo(Order::class, 'OrderId', 'Id');
    }

    public function warehouse()
    {
        return $this->belongsTo(GudangSubmission::class, 'WarehouseId');
    }

    public function routeChecks()
    {
        return $this->hasMany(ShipmentRouteCheck::class, 'ShipmentId', 'Id');
    }
}
