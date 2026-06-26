<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ShippingAllocationSubmission extends Model
{
    protected $table = 'shipping_allocation_submissions';

    protected $fillable = [
        'region', 'status', 'notes',
        'submitted_by', 'reviewed_by', 'reviewed_at', 'review_note',
    ];

    protected function casts(): array
    {
        return [
            'reviewed_at' => 'datetime',
        ];
    }

    public function items(): HasMany
    {
        return $this->hasMany(ShippingAllocationItem::class, 'submission_id');
    }
}
