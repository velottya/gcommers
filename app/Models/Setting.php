<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Setting extends Model
{
    protected $table    = 'settings';
    protected $fillable = ['key', 'value', 'label', 'unit'];

    public static function getValue(string $key, mixed $default = null): mixed
    {
        return static::where('key', $key)->value('value') ?? $default;
    }

    public static function allAsMap(): array
    {
        return static::all()->keyBy('key')->map(fn ($s) => [
            'key'   => $s->key,
            'label' => $s->label,
            'value' => $s->value,
            'unit'  => $s->unit,
        ])->toArray();
    }
}
