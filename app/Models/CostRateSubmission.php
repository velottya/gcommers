<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CostRateSubmission extends Model
{
    protected $table = 'cost_rate_submissions';

    protected $fillable = [
        'region', 'pph_persen', 'status', 'notes',
        'submitted_by', 'reviewed_by', 'reviewed_at', 'review_note',
    ];

    protected function casts(): array
    {
        return [
            'pph_persen'  => 'decimal:2',
            'reviewed_at' => 'datetime',
        ];
    }

    public function items(): HasMany
    {
        return $this->hasMany(CostRateItem::class, 'submission_id');
    }
}
