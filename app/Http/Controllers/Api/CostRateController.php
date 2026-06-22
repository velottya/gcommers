<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CostRateItem;
use App\Models\CostRateSubmission;
use App\Models\KecamatanProductPrice;
use App\Models\Product;
use App\Models\TransportPartnerRate;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class CostRateController extends Controller
{
    // ── Daftar ajuan ──────────────────────────────────────────────────────────

    public function index(Request $request)
    {
        $user  = Auth::user();
        $query = CostRateSubmission::withCount('items')
                                    ->orderByDesc('created_at')
                                    ->orderBy('region');

        if ($user->Role === 'AdminRegion') {
            $query->where('region', $user->Region);
        } elseif ($request->filled('region')) {
            $query->where('region', $request->region);
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        return response()->json($query->paginate(20));
    }

    // ── Detail satu ajuan (dengan baris tarif) ───────────────────────────────

    public function show(int $id)
    {
        $user  = Auth::user();
        $query = CostRateSubmission::with('items');

        if ($user->Role === 'AdminRegion') {
            $query->where('region', $user->Region);
        }

        return response()->json($query->findOrFail($id));
    }

    // ── Daftar kecamatan untuk form tarif (tanpa pagination) ─────────────────

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

        $submission = null;

        DB::transaction(function () use ($validated, $user, &$submission) {
            $submission = CostRateSubmission::create([
                'region'       => $user->Region,
                'status'       => 'draft',
                'notes'        => $validated['notes'] ?? null,
                'submitted_by' => $user->Email,
            ]);

            $this->syncItems($submission, $validated['products']);
        });

        return response()->json($submission->load('items'), 201);
    }

    // ── Edit ajuan (hanya draft atau rejected) ────────────────────────────────

    public function update(Request $request, int $id)
    {
        $user       = Auth::user();
        abort_unless($user->Role === 'AdminRegion', 403);

        $submission = CostRateSubmission::where('region', $user->Region)->findOrFail($id);
        abort_unless(
            in_array($submission->status, ['draft', 'rejected', 'approved', 'partially_approved'], true),
            422,
            'Ajuan ini sedang menunggu persetujuan, tidak bisa direvisi.'
        );

        $validated = $this->validatePayload($request);

        DB::transaction(function () use ($submission, $validated) {
            $submission->update([
                'notes'  => $validated['notes'] ?? null,
                'status' => 'draft',
            ]);

            $submission->items()->delete();
            $this->syncItems($submission, $validated['products']);
        });

        return response()->json($submission->fresh()->load('items'));
    }

    // ── Hapus ajuan (hanya draft) ─────────────────────────────────────────────

    public function destroy(int $id)
    {
        $user       = Auth::user();
        abort_unless($user->Role === 'AdminRegion', 403);

        $submission = CostRateSubmission::where('region', $user->Region)->findOrFail($id);
        abort_unless($submission->status === 'draft', 422, 'Hanya ajuan berstatus draft yang bisa dihapus.');

        $submission->delete();

        return response()->noContent();
    }

    // ── Ajukan ke SuperAdmin ──────────────────────────────────────────────────

    public function submit(int $id)
    {
        $user       = Auth::user();
        abort_unless($user->Role === 'AdminRegion', 403);

        $submission = CostRateSubmission::where('region', $user->Region)->findOrFail($id);
        abort_unless($submission->status === 'draft', 422, 'Ajuan ini sudah diajukan atau sudah diproses.');

        abort_if($submission->items()->doesntExist(), 422, 'Ajuan harus memiliki minimal 1 tarif sebelum diajukan.');

        $submission->update(['status' => 'submitted']);

        return response()->json($submission->fresh());
    }

    // ── Tinjau: setujui/tolak per baris tarif (SuperAdmin) ────────────────────

    public function review(Request $request, int $id)
    {
        $user = Auth::user();
        abort_unless($user->Role === 'SuperAdmin', 403);

        $submission = CostRateSubmission::with('items')->findOrFail($id);
        abort_unless($submission->status === 'submitted', 422, 'Ajuan belum diajukan.');

        $validated = $request->validate([
            'review_note'        => 'nullable|string|max:1000',
            'decisions'          => 'required|array|min:1',
            'decisions.*.id'     => 'required|integer',
            'decisions.*.status' => 'required|in:approved,rejected',
        ]);

        $itemIds     = $submission->items->pluck('id')->all();
        $decisionIds = collect($validated['decisions'])->pluck('id')->all();
        abort_unless(
            empty(array_diff($itemIds, $decisionIds)) && empty(array_diff($decisionIds, $itemIds)),
            422,
            'Keputusan harus mencakup seluruh baris tarif dalam ajuan ini.'
        );

        DB::transaction(function () use ($submission, $validated, $user) {
            $decisionMap = collect($validated['decisions'])->keyBy('id');

            foreach ($submission->items as $item) {
                $item->update(['status' => $decisionMap[$item->id]['status']]);
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

            $this->refreshCurrentPrices($submission);
        });

        return response()->json($submission->fresh()->load('items'));
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private function validatePayload(Request $request): array
    {
        return $request->validate([
            'notes'                                  => 'nullable|string|max:1000',
            'products'                               => 'required|array|min:1',
            'products.*.product_id'                  => 'required|integer|exists:product_master,id',
            'products.*.rates'                       => 'required|array|min:1',
            'products.*.rates.*.kecamatan'            => 'required|string|max:150',
            'products.*.rates.*.harga_satuan'         => 'required|numeric|min:0',
            'products.*.rates.*.transport_partner'    => 'required|string|max:200',
        ]);
    }

    // ── Harga terkini per kecamatan (current state, untuk konsumen luar) ────

    public function currentPrices(Request $request)
    {
        $user = Auth::user();
        abort_unless(in_array($user->Role, ['SuperAdmin', 'AdminRegion'], true), 403);

        $query = KecamatanProductPrice::query();

        if ($user->Role === 'AdminRegion') {
            $query->where('region', $user->Region);
        } elseif ($request->filled('region')) {
            $query->where('region', $request->region);
        }

        if ($request->filled('kecamatan')) {
            $query->where('kecamatan', $request->kecamatan);
        }

        return response()->json($query->orderBy('kecamatan')->orderBy('product_name')->get());
    }

    // ── "Current state" untuk konsumen luar (mis. app Flutter) ──────────────

    private function refreshCurrentPrices(CostRateSubmission $submission): void
    {
        foreach ($submission->items as $item) {
            if ($item->status !== 'approved') {
                continue;
            }

            KecamatanProductPrice::updateOrCreate(
                ['kecamatan' => $item->kecamatan, 'product_id' => $item->product_id],
                [
                    'region'            => $submission->region,
                    'product_code'      => $item->product_code,
                    'product_name'      => $item->product_name,
                    'harga_satuan'      => $item->harga_satuan,
                    'biaya_pengiriman'  => $item->biaya_pengiriman,
                    'transport_partner' => $item->transport_partner,
                    'submission_id'     => $submission->id,
                    'approved_at'       => now(),
                ]
            );
        }
    }

    private function syncItems(CostRateSubmission $submission, array $products): void
    {
        foreach ($products as $p) {
            $product = Product::findOrFail($p['product_id']);

            foreach ($p['rates'] as $rate) {
                $shippingCost = TransportPartnerRate::where('region', $submission->region)
                    ->where('company_name', $rate['transport_partner'])
                    ->value('shipping_cost_per_kg');

                abort_if(
                    $shippingCost === null,
                    422,
                    "Belum ada tarif untuk mitra {$rate['transport_partner']}, atur dulu di halaman Tarif Mitra Transportir."
                );

                CostRateItem::create([
                    'submission_id'     => $submission->id,
                    'product_id'        => $product->id,
                    'product_code'      => $product->kode_produk,
                    'product_name'      => $product->nama_produk,
                    'kecamatan'         => $rate['kecamatan'],
                    'transport_partner' => $rate['transport_partner'],
                    'harga_satuan'      => $rate['harga_satuan'],
                    'biaya_pengiriman'  => $shippingCost,
                ]);
            }
        }
    }
}
