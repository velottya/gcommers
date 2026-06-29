<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SoSubmissionLine extends Model
{
    protected $table = 'so_submission_lines';

    protected $fillable = [
        'submission_id', 'kecamatan_id', 'kabupaten_id', 'product_id', 'product_code',
        'product_name', 'unit', 'total_quantity', 'so_code', 'status',
        'reviewed_by', 'reviewed_at', 'review_note',
    ];

    protected function casts(): array
    {
        return [
            'total_quantity' => 'decimal:2',
            'reviewed_at'    => 'datetime',
        ];
    }

    public function submission(): BelongsTo
    {
        return $this->belongsTo(SoSubmission::class, 'submission_id');
    }

    public function kecamatan(): BelongsTo
    {
        return $this->belongsTo(Kecamatan::class, 'kecamatan_id');
    }

    public function gudangs(): BelongsToMany
    {
        return $this->belongsToMany(GudangSubmission::class, 'so_submission_line_gudangs', 'line_id', 'gudang_submission_id')
            ->withTimestamps();
    }

    public function coveredOrders(): HasMany
    {
        return $this->hasMany(SoSubmissionLineOrder::class, 'line_id');
    }
}
