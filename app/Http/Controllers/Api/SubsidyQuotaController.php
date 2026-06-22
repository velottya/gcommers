<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\KecamatanProductStock;
use App\Models\Product;
use App\Models\SubsidyQuotaKecamatanAllocation;
use App\Models\SubsidyQuotaProduct;
use App\Models\SubsidyQuotaSubmission;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class SubsidyQuotaController extends Controller
{
    // ── Daftar ajuan ──────────────────────────────────────────────────────────

    public function index(Request $request)
    {
        $user  = Auth::user();
        $query = SubsidyQuotaSubmission::withCount('products')
                                        ->orderByDesc('period')
                                        ->orderBy('region');

        if ($user->Role === 'AdminRegion') {
            $query->where('region', $user->Region);
        } elseif ($request->filled('region')) {
            $query->where('region', $request->region);
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('period')) {
            $query->where('period', $request->period);
        }

        if ($request->filled('date_from')) {
            $query->whereDate('created_at', '>=', $request->date_from);
        }

        if ($request->filled('date_to')) {
            $query->whereDate('created_at', '<=', $request->date_to);
        }

        return response()->json($query->paginate(20));
    }

    // ── Detail satu ajuan (dengan produk + alokasi kecamatan) ────────────────

    public function show(int $id)
    {
        $user       = Auth::user();
        $query      = SubsidyQuotaSubmission::with('products.kecamatanAllocations');

        if ($user->Role === 'AdminRegion') {
            $query->where('region', $user->Region);
        }

        return response()->json($query->findOrFail($id));
    }

    // ── Daftar kecamatan untuk form alokasi (tanpa pagination) ───────────────

    public function kecamatanList()
    {
        $user = Auth::user();
        abort_unless($user->Role === 'AdminRegion', 403);

        $kecamatan = User::where('Role', 'kiosk')
                      ->where('Region', $user->Region)
                      ->whereNotNull('Kecamatan')
                      ->where('Kecamatan', '!=', '')
                      ->distinct()
                      ->orderBy('Kecamatan')
                      ->pluck('Kecamatan');

        return response()->json($kecamatan);
    }

    // ── Buat ajuan baru (draft) ───────────────────────────────────────────────

    public function store(Request $request)
    {
        $user = Auth::user();
        abort_unless($user->Role === 'AdminRegion', 403);

        $validated = $this->validatePayload($request);

        $exists = SubsidyQuotaSubmission::where('region', $user->Region)
                                         ->where('period', $validated['period'])
                                         ->exists();
        abort_if($exists, 422, "Ajuan quota untuk region {$user->Region} tahun {$validated['period']} sudah ada. Edit ajuan yang sudah ada untuk merevisi alokasinya.");

        $submission = null;

        DB::transaction(function () use ($validated, $user, &$submission) {
            $submission = SubsidyQuotaSubmission::create([
                'region'       => $user->Region,
                'period'       => $validated['period'],
                'status'       => 'draft',
                'notes'        => $validated['notes'] ?? null,
                'submitted_by' => $user->Email,
            ]);

            $this->syncProducts($submission, $validated['products']);
        });

        return response()->json($submission->load('products.kecamatanAllocations'), 201);
    }

    // ── Edit ajuan (hanya draft atau rejected) ────────────────────────────────

    public function update(Request $request, int $id)
    {
        $user       = Auth::user();
        abort_unless($user->Role === 'AdminRegion', 403);

        $submission = SubsidyQuotaSubmission::where('region', $user->Region)->findOrFail($id);
        abort_unless(
            in_array($submission->status, ['draft', 'rejected', 'approved', 'partially_approved'], true),
            422,
            'Ajuan ini sedang menunggu persetujuan, tidak bisa direvisi.'
        );

        $validated = $this->validatePayload($request);

        DB::transaction(function () use ($submission, $validated) {
            $submission->update([
                'period' => $validated['period'],
                'notes'  => $validated['notes'] ?? null,
                'status' => 'draft',
            ]);

            // Hapus produk lama (cascade ke kecamatan_allocations)
            $submission->products()->delete();
            $this->syncProducts($submission, $validated['products']);
        });

        return response()->json($submission->fresh()->load('products.kecamatanAllocations'));
    }

    // ── Hapus ajuan (hanya draft) ─────────────────────────────────────────────

    public function destroy(int $id)
    {
        $user       = Auth::user();
        abort_unless($user->Role === 'AdminRegion', 403);

        $submission = SubsidyQuotaSubmission::where('region', $user->Region)->findOrFail($id);
        abort_unless($submission->status === 'draft', 422, 'Hanya ajuan berstatus draft yang bisa dihapus.');

        $submission->delete();

        return response()->noContent();
    }

    // ── Ajukan ke SuperAdmin ──────────────────────────────────────────────────

    public function submit(int $id)
    {
        $user       = Auth::user();
        abort_unless($user->Role === 'AdminRegion', 403);

        $submission = SubsidyQuotaSubmission::where('region', $user->Region)->findOrFail($id);
        abort_unless($submission->status === 'draft', 422, 'Ajuan ini sudah diajukan atau sudah diproses.');

        abort_if($submission->products()->doesntExist(), 422, 'Ajuan harus memiliki minimal 1 produk sebelum diajukan.');

        $submission->update(['status' => 'submitted']);

        return response()->json($submission->fresh());
    }

    // ── Tinjau: setujui/tolak per baris kecamatan (SuperAdmin) ────────────────

    public function review(Request $request, int $id)
    {
        $user = Auth::user();
        abort_unless($user->Role === 'SuperAdmin', 403);

        $submission = SubsidyQuotaSubmission::with('products.kecamatanAllocations')->findOrFail($id);
        abort_unless($submission->status === 'submitted', 422, 'Ajuan belum diajukan.');

        $validated = $request->validate([
            'review_note'         => 'nullable|string|max:1000',
            'decisions'           => 'required|array|min:1',
            'decisions.*.id'      => 'required|integer',
            'decisions.*.status'  => 'required|in:approved,rejected',
        ]);

        $allocationIds = $submission->products->flatMap(fn ($p) => $p->kecamatanAllocations->pluck('id'))->all();
        $decisionIds   = collect($validated['decisions'])->pluck('id')->all();
        abort_unless(
            empty(array_diff($allocationIds, $decisionIds)) && empty(array_diff($decisionIds, $allocationIds)),
            422,
            'Keputusan harus mencakup seluruh baris kecamatan dalam ajuan ini.'
        );

        DB::transaction(function () use ($submission, $validated, $user) {
            $decisionMap = collect($validated['decisions'])->keyBy('id');

            foreach ($submission->products as $product) {
                foreach ($product->kecamatanAllocations as $alloc) {
                    $alloc->update(['status' => $decisionMap[$alloc->id]['status']]);
                }
            }

            $statuses = $decisionMap->pluck('status')->unique();
            $overall  = $statuses->count() === 1
                ? $statuses->first()
                : 'partially_approved';

            $submission->update([
                'status'      => $overall,
                'reviewed_by' => $user->Email,
                'reviewed_at' => now(),
                'review_note' => $validated['review_note'] ?? null,
            ]);

            $this->refreshCurrentStock($submission);
        });

        return response()->json($submission->fresh()->load('products.kecamatanAllocations'));
    }

    // ── Stok terkini per kecamatan (current state, untuk konsumen luar) ─────

    public function currentStock(Request $request)
    {
        $user = Auth::user();
        abort_unless(in_array($user->Role, ['SuperAdmin', 'AdminRegion'], true), 403);

        $query = KecamatanProductStock::query();

        if ($user->Role === 'AdminRegion') {
            $query->where('region', $user->Region);
        } elseif ($request->filled('region')) {
            $query->where('region', $request->region);
        }

        if ($request->filled('kecamatan')) {
            $query->where('kecamatan', $request->kecamatan);
        }

        if ($request->filled('period')) {
            $query->where('period', $request->period);
        }

        $rows = $query->orderBy('kecamatan')->orderBy('product_name')->get()->map(function (KecamatanProductStock $s) {
            $used = $s->usedTon();

            return [
                'id'            => $s->id,
                'region'        => $s->region,
                'kecamatan'     => $s->kecamatan,
                'product_id'    => $s->product_id,
                'product_code'  => $s->product_code,
                'product_name'  => $s->product_name,
                'period'        => $s->period,
                'quota_ton'     => (float) $s->quota_ton,
                'used_ton'      => $used,
                'remaining_ton' => max(0, (float) $s->quota_ton - $used),
                'approved_at'   => $s->approved_at,
            ];
        });

        return response()->json($rows);
    }

    // ── "Current state" untuk konsumen luar (mis. app Flutter) ──────────────

    private function refreshCurrentStock(SubsidyQuotaSubmission $submission): void
    {
        foreach ($submission->products as $product) {
            foreach ($product->kecamatanAllocations as $alloc) {
                if ($alloc->status !== 'approved') {
                    continue;
                }

                KecamatanProductStock::updateOrCreate(
                    [
                        'kecamatan'  => $alloc->kecamatan,
                        'product_id' => $product->product_id,
                        'period'     => $submission->period,
                    ],
                    [
                        'region'        => $submission->region,
                        'product_code'  => $product->product_code,
                        'product_name'  => $product->product_name,
                        'quota_ton'     => $alloc->qty_ton,
                        'submission_id' => $submission->id,
                        'approved_at'   => now(),
                    ]
                );
            }
        }
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private function validatePayload(Request $request): array
    {
        return $request->validate([
            'period'                                         => ['required', 'regex:/^\d{4}$/'],
            'notes'                                          => 'nullable|string|max:1000',
            'products'                                       => 'required|array|min:1',
            'products.*.product_id'                          => 'required|integer|exists:product_master,id',
            'products.*.kecamatan_allocations'                => 'required|array|min:1',
            'products.*.kecamatan_allocations.*.kecamatan'    => 'required|string|max:150',
            'products.*.kecamatan_allocations.*.qty_ton'      => 'required|numeric|min:0.01',
        ]);
    }

    private function syncProducts(SubsidyQuotaSubmission $submission, array $products): void
    {
        foreach ($products as $p) {
            $product     = Product::findOrFail($p['product_id']);
            $totalQtyTon = array_sum(array_column($p['kecamatan_allocations'], 'qty_ton'));

            $quotaProduct = SubsidyQuotaProduct::create([
                'submission_id' => $submission->id,
                'product_id'    => $product->id,
                'product_code'  => $product->kode_produk,
                'product_name'  => $product->nama_produk,
                'total_qty_ton' => $totalQtyTon,
            ]);

            foreach ($p['kecamatan_allocations'] as $alloc) {
                SubsidyQuotaKecamatanAllocation::create([
                    'quota_product_id' => $quotaProduct->id,
                    'kecamatan'        => $alloc['kecamatan'],
                    'qty_ton'          => $alloc['qty_ton'],
                ]);
            }
        }
    }
}
