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

    // Wilayah cakupan gudang: banyak kecamatan (lintas kabupaten), bukan 1.
    public function kecamatans()
    {
        return $this->belongsToMany(Kecamatan::class, 'gudang_submission_kecamatans', 'gudang_submission_id', 'kecamatan_id')
            ->withTimestamps();
    }

    public function shipments()
    {
        return $this->hasMany(Shipment::class, 'WarehouseId');
    }
}
