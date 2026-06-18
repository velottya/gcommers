<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\SubsidyQuotaKioskAllocation;
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
                                        ->orderByDesc('year')
                                        ->orderBy('region');

        if ($user->Role === 'AdminRegion') {
            $query->where('region', $user->Region);
        } elseif ($request->filled('region')) {
            $query->where('region', $request->region);
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('year')) {
            $query->where('year', $request->year);
        }

        return response()->json($query->paginate(20));
    }

    // ── Detail satu ajuan (dengan produk + alokasi kiosk) ────────────────────

    public function show(int $id)
    {
        $user       = Auth::user();
        $query      = SubsidyQuotaSubmission::with('products.kioskAllocations');

        if ($user->Role === 'AdminRegion') {
            $query->where('region', $user->Region);
        }

        return response()->json($query->findOrFail($id));
    }

    // ── Kiosk list untuk form alokasi (tanpa pagination) ─────────────────────

    public function kiosks(Request $request)
    {
        $user = Auth::user();
        abort_unless($user->Role === 'AdminRegion', 403);

        $kiosks = User::where('Role', 'kiosk')
                      ->where('Region', $user->Region)
                      ->orderBy('KioskName')
                      ->get(['Id', 'KioskName', 'Email'])
                      ->map(fn ($u) => [
                          'id'    => $u->Id,
                          'name'  => $u->KioskName ?? $u->Email,
                          'email' => $u->Email,
                      ]);

        return response()->json($kiosks);
    }

    // ── Buat ajuan baru (draft) ───────────────────────────────────────────────

    public function store(Request $request)
    {
        $user = Auth::user();
        abort_unless($user->Role === 'AdminRegion', 403);

        $validated = $this->validatePayload($request);

        $exists = SubsidyQuotaSubmission::where('region', $user->Region)
                                         ->where('year', $validated['year'])
                                         ->exists();
        abort_if($exists, 422, "Ajuan quota untuk region {$user->Region} tahun {$validated['year']} sudah ada.");

        $submission = null;

        DB::transaction(function () use ($validated, $user, &$submission) {
            $submission = SubsidyQuotaSubmission::create([
                'region'       => $user->Region,
                'year'         => $validated['year'],
                'status'       => 'draft',
                'notes'        => $validated['notes'] ?? null,
                'submitted_by' => $user->Email,
            ]);

            $this->syncProducts($submission, $validated['products']);
        });

        return response()->json($submission->load('products.kioskAllocations'), 201);
    }

    // ── Edit ajuan (hanya draft atau rejected) ────────────────────────────────

    public function update(Request $request, int $id)
    {
        $user       = Auth::user();
        abort_unless($user->Role === 'AdminRegion', 403);

        $submission = SubsidyQuotaSubmission::where('region', $user->Region)->findOrFail($id);
        abort_unless(
            in_array($submission->status, ['draft', 'rejected'], true),
            422,
            'Hanya ajuan berstatus draft atau ditolak yang bisa diedit.'
        );

        $validated = $this->validatePayload($request);

        DB::transaction(function () use ($submission, $validated) {
            $submission->update([
                'year'   => $validated['year'],
                'notes'  => $validated['notes'] ?? null,
                'status' => 'draft',
            ]);

            // Hapus produk lama (cascade ke kiosk_allocations)
            $submission->products()->delete();
            $this->syncProducts($submission, $validated['products']);
        });

        return response()->json($submission->fresh()->load('products.kioskAllocations'));
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

    // ── Setujui (SuperAdmin) ──────────────────────────────────────────────────

    public function approve(Request $request, int $id)
    {
        $user = Auth::user();
        abort_unless($user->Role === 'SuperAdmin', 403);

        $submission = SubsidyQuotaSubmission::findOrFail($id);
        abort_unless($submission->status === 'submitted', 422, 'Ajuan belum diajukan.');

        $submission->update([
            'status'      => 'approved',
            'reviewed_by' => $user->Email,
            'reviewed_at' => now(),
            'review_note' => $request->input('review_note'),
        ]);

        return response()->json($submission->fresh());
    }

    // ── Tolak (SuperAdmin) ────────────────────────────────────────────────────

    public function reject(Request $request, int $id)
    {
        $user = Auth::user();
        abort_unless($user->Role === 'SuperAdmin', 403);

        $submission = SubsidyQuotaSubmission::findOrFail($id);
        abort_unless($submission->status === 'submitted', 422, 'Ajuan belum diajukan.');

        $submission->update([
            'status'      => 'rejected',
            'reviewed_by' => $user->Email,
            'reviewed_at' => now(),
            'review_note' => $request->input('review_note'),
        ]);

        return response()->json($submission->fresh());
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private function validatePayload(Request $request): array
    {
        return $request->validate([
            'year'                                           => 'required|integer|min:2024|max:2100',
            'notes'                                          => 'nullable|string|max:1000',
            'products'                                       => 'required|array|min:1',
            'products.*.product_id'                          => 'required|integer|exists:product_master,id',
            'products.*.total_qty_ton'                       => 'required|numeric|min:0.01',
            'products.*.kiosk_allocations'                   => 'required|array|min:1',
            'products.*.kiosk_allocations.*.kiosk_id'        => 'required|integer',
            'products.*.kiosk_allocations.*.kiosk_name'      => 'required|string|max:200',
            'products.*.kiosk_allocations.*.kiosk_email'     => 'required|email|max:256',
            'products.*.kiosk_allocations.*.qty_ton'         => 'required|numeric|min:0.01',
        ]);
    }

    private function syncProducts(SubsidyQuotaSubmission $submission, array $products): void
    {
        foreach ($products as $p) {
            $product      = Product::findOrFail($p['product_id']);
            $quotaProduct = SubsidyQuotaProduct::create([
                'submission_id' => $submission->id,
                'product_id'    => $product->id,
                'product_code'  => $product->kode_produk,
                'product_name'  => $product->nama_produk,
                'total_qty_ton' => $p['total_qty_ton'],
            ]);

            foreach ($p['kiosk_allocations'] as $alloc) {
                SubsidyQuotaKioskAllocation::create([
                    'quota_product_id' => $quotaProduct->id,
                    'kiosk_id'         => $alloc['kiosk_id'],
                    'kiosk_name'       => $alloc['kiosk_name'],
                    'kiosk_email'      => $alloc['kiosk_email'],
                    'qty_ton'          => $alloc['qty_ton'],
                ]);
            }
        }
    }
}
