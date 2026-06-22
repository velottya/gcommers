<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class KecamatanProductStock extends Model
{
    protected $table = 'kecamatan_product_stocks';

    protected $fillable = [
        'region', 'kecamatan', 'product_id', 'product_code', 'product_name',
        'period', 'quota_ton', 'submission_id', 'approved_at',
    ];

    protected function casts(): array
    {
        return [
            'quota_ton'   => 'decimal:2',
            'approved_at' => 'datetime',
        ];
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function submission(): BelongsTo
    {
        return $this->belongsTo(SubsidyQuotaSubmission::class, 'submission_id');
    }

    /**
     * Total kuantitas (TON) yang sudah terpakai oleh pesanan kiosk di kecamatan ini,
     * untuk produk & periode (tahun) yang sama. Dihitung langsung dari Orders/OrderItems
     * tiap kali dipanggil — bukan counter tersimpan — karena pesanan dibuat oleh sistem
     * lain (bukan admin console ini), jadi tidak bisa diandalkan untuk hook saat order dibuat.
     */
    public function usedTon(): float
    {
        [$start, $end] = self::periodRange($this->period);

        return (float) DB::table('OrderItems')
            ->join('Orders', 'Orders.Id', '=', 'OrderItems.OrderId')
            ->join('Users', 'Users.Email', '=', 'Orders.UserEmail')
            ->where('Users.Role', 'kiosk')
            ->where('Users.Kecamatan', $this->kecamatan)
            ->where('OrderItems.ProductId', $this->product_id)
            ->whereNotIn('Orders.Status', ['pending_payment', 'cancelled'])
            ->whereBetween('Orders.CreatedAt', [$start, $end])
            ->sum('OrderItems.Quantity');
    }

    public function remainingTon(): float
    {
        return max(0, (float) $this->quota_ton - $this->usedTon());
    }

    private static function periodRange(string $period): array
    {
        $start = Carbon::createFromFormat('Y', $period)->startOfYear();

        return [$start, $start->copy()->endOfYear()];
    }
}
