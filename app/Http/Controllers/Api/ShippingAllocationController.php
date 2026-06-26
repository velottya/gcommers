<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\KecamatanShippingRate;
use App\Models\ShippingAllocationItem;
use App\Models\ShippingAllocationSubmission;
use App\Models\TransportPartnerRate;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

/**
 * Alokasi biaya pengiriman per kecamatan: untuk tiap kecamatan, pilih 1 mitra
 * transportir + ongkirnya (Rp/kg). Terpisah dari Harga Produk (CostRateController) --
 * ongkir adalah soal "kecamatan ini dikirim mitra apa", lepas dari produk yang
 * dikirim. 1 kecamatan = 1 mitra transportir per ajuan.
 */
class ShippingAllocationController extends Controller
{
    // ── Daftar ajuan ──────────────────────────────────────────────────────────

    public function index(Request $request)
    {
        $user  = Auth::user();
        $query = ShippingAllocationSubmission::withCount('items')
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

    // ── Detail satu ajuan (dengan baris kecamatan) ───────────────────────────

    public function show(int $id)
    {
        $user  = Auth::user();
        $query = ShippingAllocationSubmission::with('items');

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

        $submission = null;

        DB::transaction(function () use ($validated, $user, &$submission) {
            $submission = ShippingAllocationSubmission::create([
                'region'       => $user->Region,
                'status'       => 'draft',
                'notes'        => $validated['notes'] ?? null,
                'submitted_by' => $user->Email,
            ]);

            $this->syncItems($submission, $validated['items']);
        });

        return response()->json($submission->load('items'), 201);
    }

    // ── Edit ajuan (hanya draft, rejected, approved, partially_approved) ─────

    public function update(Request $request, int $id)
    {
        $user       = Auth::user();
        abort_unless($user->Role === 'AdminRegion', 403);

        $submission = ShippingAllocationSubmission::where('region', $user->Region)->findOrFail($id);
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
            $this->syncItems($submission, $validated['items']);
        });

        return response()->json($submission->fresh()->load('items'));
    }

    // ── Hapus ajuan (hanya draft) ─────────────────────────────────────────────

    public function destroy(int $id)
    {
        $user       = Auth::user();
        abort_unless($user->Role === 'AdminRegion', 403);

        $submission = ShippingAllocationSubmission::where('region', $user->Region)->findOrFail($id);
        abort_unless($submission->status === 'draft', 422, 'Hanya ajuan berstatus draft yang bisa dihapus.');

        $submission->delete();

        return response()->noContent();
    }

    // ── Ajukan ke SuperAdmin ──────────────────────────────────────────────────

    public function submit(int $id)
    {
        $user       = Auth::user();
        abort_unless($user->Role === 'AdminRegion', 403);

        $submission = ShippingAllocationSubmission::where('region', $user->Region)->findOrFail($id);
        abort_unless($submission->status === 'draft', 422, 'Ajuan ini sudah diajukan atau sudah diproses.');

        abort_if($submission->items()->doesntExist(), 422, 'Ajuan harus memiliki minimal 1 alokasi sebelum diajukan.');

        $submission->update(['status' => 'submitted']);

        return response()->json($submission->fresh());
    }

    // ── Tinjau: setujui/tolak per baris kecamatan (SuperAdmin) ────────────────

    public function review(Request $request, int $id)
    {
        $user = Auth::user();
        abort_unless($user->Role === 'SuperAdmin', 403);

        $submission = ShippingAllocationSubmission::with('items')->findOrFail($id);
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
            'Keputusan harus mencakup seluruh baris alokasi dalam ajuan ini.'
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

            $this->refreshCurrentRates($submission);
        });

        return response()->json($submission->fresh()->load('items'));
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private function validatePayload(Request $request): array
    {
        $validated = $request->validate([
            'notes'                       => 'nullable|string|max:1000',
            'items'                       => 'required|array|min:1',
            'items.*.kecamatan'           => 'required|string|max:150',
            'items.*.transport_partner'   => 'required|string|max:200',
        ]);

        // 1 kecamatan = 1 mitra transportir per ajuan.
        $seen = [];
        foreach ($validated['items'] as $item) {
            abort_if(
                isset($seen[$item['kecamatan']]),
                422,
                "Kecamatan {$item['kecamatan']} tidak boleh muncul lebih dari sekali — 1 kecamatan hanya boleh punya 1 mitra transportir."
            );
            $seen[$item['kecamatan']] = true;
        }

        return $validated;
    }

    private function syncItems(ShippingAllocationSubmission $submission, array $items): void
    {
        foreach ($items as $item) {
            $shippingCost = TransportPartnerRate::where('region', $submission->region)
                ->where('company_name', $item['transport_partner'])
                ->value('shipping_cost_per_kg');

            abort_if(
                $shippingCost === null,
                422,
                "Belum ada tarif untuk mitra {$item['transport_partner']}, atur dulu di tab Menentukan Tarif Transportir."
            );

            ShippingAllocationItem::create([
                'submission_id'     => $submission->id,
                'kecamatan'         => $item['kecamatan'],
                'transport_partner' => $item['transport_partner'],
                'biaya_pengiriman'  => $shippingCost,
            ]);
        }
    }

    // ── Tarif pengiriman terkini per kecamatan (current state, konsumen luar) ─

    public function currentRates(Request $request)
    {
        $user = Auth::user();
        abort_unless(in_array($user->Role, ['SuperAdmin', 'AdminRegion'], true), 403);

        $query = KecamatanShippingRate::query();

        if ($user->Role === 'AdminRegion') {
            $query->where('region', $user->Region);
        } elseif ($request->filled('region')) {
            $query->where('region', $request->region);
        }

        return response()->json($query->orderBy('kecamatan')->get());
    }

    // ── "Current state" untuk konsumen luar (mis. app Flutter) ──────────────
    //
    // kecamatan_product_prices dipertahankan apa adanya (kontrak existing dengan
    // app Flutter) — transport_partner/biaya_pengiriman di tabel itu sekarang
    // disinkronkan dari sini, bukan dari Harga Produk.

    private function refreshCurrentRates(ShippingAllocationSubmission $submission): void
    {
        foreach ($submission->items as $item) {
            if ($item->status !== 'approved') {
                continue;
            }

            KecamatanShippingRate::updateOrCreate(
                ['kecamatan' => $item->kecamatan],
                [
                    'region'            => $submission->region,
                    'transport_partner' => $item->transport_partner,
                    'biaya_pengiriman'  => $item->biaya_pengiriman,
                    'submission_id'     => $submission->id,
                    'approved_at'       => now(),
                ]
            );

            DB::table('kecamatan_product_prices')
                ->where('kecamatan', $item->kecamatan)
                ->update([
                    'transport_partner' => $item->transport_partner,
                    'biaya_pengiriman'  => $item->biaya_pengiriman,
                ]);
        }
    }
}
