<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SubsidyQuota extends Model
{
    protected $table    = 'subsidy_quotas';
    protected $fillable = [
        'region', 'kiosk_email', 'product_code',
        'quota_kg', 'used_kg', 'period', 'status',
        'created_by', 'reviewed_by', 'reviewed_at', 'review_note',
    ];

    protected $casts = [
        'quota_kg'    => 'decimal:2',
        'used_kg'     => 'decimal:2',
        'reviewed_at' => 'datetime',
    ];
}
