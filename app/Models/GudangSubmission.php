<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class GudangSubmission extends Model
{
    protected $table = 'gudang_submissions';

    protected $fillable = [
        'nama_gudang',
        'nama_pic',
        'no_telp',
        'alamat_gudang',
        'kelurahan',
        'kode_pos',
        'latitude',
        'longitude',
        'region_id',
        'propinsi_id',
        'kabupaten_id',
        'kecamatan_id',
        'status',
        'submitted_by',
        'reviewed_by',
        'reviewed_at',
        'review_note',
    ];

    protected $casts = [
        'latitude'    => 'decimal:6',
        'longitude'   => 'decimal:6',
        'reviewed_at' => 'datetime',
    ];

    public function region()
    {
        return $this->belongsTo(Region::class);
    }

    public function propinsi()
    {
        return $this->belongsTo(Propinsi::class);
    }

    public function kabupaten()
    {
        return $this->belongsTo(Kabupaten::class);
    }

    public function kecamatan()
    {
        return $this->belongsTo(Kecamatan::class);
    }

    public function shipments()
    {
        return $this->hasMany(Shipment::class, 'WarehouseId');
    }
}
