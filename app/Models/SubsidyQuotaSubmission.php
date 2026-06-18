<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SubsidyQuotaSubmission extends Model
{
    protected $table = 'subsidy_quota_submissions';

    protected $fillable = [
        'region', 'year', 'status', 'notes',
        'submitted_by', 'reviewed_by', 'reviewed_at', 'review_note',
    ];

    protected function casts(): array
    {
        return [
            'year'        => 'integer',
            'reviewed_at' => 'datetime',
        ];
    }

    public function products(): HasMany
    {
        return $this->hasMany(SubsidyQuotaProduct::class, 'submission_id');
    }
}
