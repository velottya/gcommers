<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SubsidyQuota extends Model
{
    protected $table    = 'subsidy_quotas';
    protected $fillable = ['region', 'kiosk_email', 'product_code', 'quota_kg', 'period', 'status', 'created_by'];
}
