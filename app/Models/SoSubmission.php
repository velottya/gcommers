<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SoSubmission extends Model
{
    protected $table = 'so_submissions';

    protected $fillable = [
        'region', 'status', 'submitted_by', 'reviewed_by', 'reviewed_at', 'review_note',
    ];

    protected function casts(): array
    {
        return [
            'reviewed_at' => 'datetime',
        ];
    }

    public function lines(): HasMany
    {
        return $this->hasMany(SoSubmissionLine::class, 'submission_id');
    }
}
