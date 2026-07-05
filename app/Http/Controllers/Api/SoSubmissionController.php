<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\GudangSubmission;
use App\Models\Order;
use App\Models\SoSubmission;
use App\Models\User;
use App\Models\SoSubmissionLine;
use App\Models\SoSubmissionLineOrder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

/**
 * Pengajuan SO (Sales Order) — menggantikan "Pilih Gudang per pesanan". AdminRegion
 * merekap pesanan yang sudah dibayar & belum ber-SO, dikelompokkan per (kecamatan,
 * produk) — 1 kombinasi = 1 baris SO. SuperAdmin meninjau, mengisi kode SO +
 * memilih gudang aktif (boleh >1) per baris. Lihat OrderController::format() untuk
 * bagaimana hasilnya ditampilkan di Detail Pesanan.
 */
class SoSubmissionController extends Controller
{
    public function preview()
    {
        $user = Auth::user();
        abort_unless($user->Role === 'AdminRegion', 403, 'Akses tidak diizinkan.');

        $groups = $this->buildRecapGroups($user->Region);

        return response()->json($groups->map(fn ($g) => [
            'kecamatan_id'   => $g['kecamatan_id'],
            'kecamatan_nama' => $g['kecamatan_nama'],
            'kabupaten_nama' => $g['kabupaten_nama'],
            'product_id'     => $g['product_id'],
            'product_code'   => $g['product_code'],
            'product_name'   => $g['product_name'],
            'unit'           => $g['unit'],
            'total_quantity' => $g['total_quantity'],
            'order_count'    => count($g['covered']),
        ])->values());
    }

    public function store()
    {
        $user = Auth::user();
        abort_unless($user->Role === 'AdminRegion', 403, 'Akses tidak diizinkan.');

        $groups = $this->buildRecapGroups($user->Region);
        abort_if($groups->isEmpty(), 422, 'Tidak ada pesanan yang perlu diajukan SO saat ini.');

        $submission = null;

        DB::transaction(function () use ($groups, $user, &$submission) {
            $submission = SoSubmission::create([
                'region'       => $user->Region,
                'status'       => 'submitted',
                'submitted_by' => $user->Email,
            ]);

            foreach ($groups as $g) {
                $line = SoSubmissionLine::create([
                    'submission_id'  => $submission->id,
                    'kecamatan_id'   => $g['kecamatan_id'],
                    'kabupaten_id'   => $g['kabupaten_id'],
                    'product_id'     => $g['product_id'],
                    'product_code'   => $g['product_code'],
                    'product_name'   => $g['product_name'],
                    'unit'           => $g['unit'],
                    'total_quantity' => $g['total_quantity'],
                ]);

                foreach ($g['covered'] as $covered) {
                    SoSubmissionLineOrder::create([
                        'line_id'    => $line->id,
                        'order_id'   => $covered['order_id'],
                        'product_id' => $g['product_id'],
                        'quantity'   => $covered['quantity'],
                    ]);
                }
            }
        });

        return response()->json($submission->load('lines'), 201);
    }

    public function index(Request $request)
    {
        $user  = Auth::user();
        $query = SoSubmission::withCount('lines')->orderByDesc('created_at');

        if ($user->Role === 'AdminRegion') {
            $query->where('region', $user->Region);
        } elseif ($request->filled('region')) {
            $query->where('region', $request->region);
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        $paginated = $query->paginate(20);
        $ids = $paginated->pluck('id')->all();

        // Batch-count approved SO codes (lines with status = approved) per submission
        $soCodeCounts = SoSubmissionLine::whereIn('submission_id', $ids)
            ->where('status', 'approved')
            ->selectRaw('submission_id, COUNT(*) as so_codes_count')
            ->groupBy('submission_id')
            ->pluck('so_codes_count', 'submission_id')
            ->all();

        // Batch-count distinct gudangs assigned to approved lines per submission
        $gudangCounts = DB::table('so_submission_line_gudangs as g')
            ->join('so_submission_lines as l', 'g.line_id', '=', 'l.id')
            ->whereIn('l.submission_id', $ids)
            ->selectRaw('l.submission_id, COUNT(DISTINCT g.gudang_submission_id) as gudang_count')
            ->groupBy('l.submission_id')
            ->pluck('gudang_count', 'submission_id')
            ->all();

        $emails  = $paginated->pluck('submitted_by')->unique()->filter()->values()->all();
        $nameMap = User::whereIn('Email', $emails)->pluck('DisplayName', 'Email')->all();

        return response()->json(
            $paginated->through(fn (SoSubmission $s) => array_merge($s->toArray(), [
                'so_codes_count'    => (int) ($soCodeCounts[$s->id] ?? 0),
                'gudang_count'      => (int) ($gudangCounts[$s->id] ?? 0),
                'submitted_by_name' => $nameMap[$s->submitted_by] ?? $s->submitted_by,
            ]))
        );
    }

    public function show(int $id)
    {
        $user       = Auth::user();
        $query      = SoSubmission::with(['lines.kecamatan.kabupaten', 'lines.gudangs']);
        $submission = $user->Role === 'AdminRegion'
            ? $query->where('region', $user->Region)->findOrFail($id)
            : $query->findOrFail($id);

        $payload = $submission->toArray();
        $payload['lines'] = $submission->lines->map(function (SoSubmissionLine $line) use ($submission) {
            $arr = $line->toArray();
            $arr['gudang_options'] = $this->gudangOptionsFor($submission->region, $line->kecamatan_id);

            return $arr;
        });

        return response()->json($payload);
    }

    public function review(Request $request, int $id)
    {
        $user = Auth::user();
        abort_unless($user->Role === 'SuperAdmin', 403, 'Akses tidak diizinkan.');

        $submission = SoSubmission::with('lines')->findOrFail($id);
        abort_unless($submission->status === 'submitted', 422, 'Ajuan belum diajukan atau sudah diproses.');

        $validated = $request->validate([
            'review_note'                     => 'nullable|string|max:1000',
            'decisions'                       => 'required|array|min:1',
            'decisions.*.id'                  => 'required|integer',
            'decisions.*.status'              => 'required|in:approved,rejected',
            'decisions.*.so_code'             => 'nullable|string|max:100',
            'decisions.*.gudang_submission_ids'   => 'nullable|array',
            'decisions.*.gudang_submission_ids.*'  => 'integer',
        ]);

        $lineIds     = $submission->lines->pluck('id')->all();
        $decisionIds = collect($validated['decisions'])->pluck('id')->all();
        abort_unless(
            empty(array_diff($lineIds, $decisionIds)) && empty(array_diff($decisionIds, $lineIds)),
            422,
            'Keputusan harus mencakup seluruh baris dalam ajuan ini.'
        );

        foreach ($validated['decisions'] as $decision) {
            if ($decision['status'] === 'approved') {
                abort_if(empty($decision['so_code']), 422, 'Kode SO wajib diisi untuk baris yang disetujui.');
                abort_if(empty($decision['gudang_submission_ids']), 422, 'Pilih minimal 1 gudang aktif untuk baris yang disetujui.');
            }
        }

        DB::transaction(function () use ($submission, $validated, $user) {
            $decisionMap = collect($validated['decisions'])->keyBy('id');

            foreach ($submission->lines as $line) {
                $decision = $decisionMap[$line->id];

                $line->update([
                    'status'      => $decision['status'],
                    'so_code'     => $decision['status'] === 'approved' ? $decision['so_code'] : null,
                    'reviewed_by' => $user->Email,
                    'reviewed_at' => now(),
                    'review_note' => $validated['review_note'] ?? null,
                ]);

                if ($decision['status'] === 'approved') {
                    $validIds = $this->gudangOptionsFor($submission->region, $line->kecamatan_id)->pluck('id');
                    $selected = collect($decision['gudang_submission_ids'])->filter(fn ($gid) => $validIds->contains($gid));
                    $line->gudangs()->sync($selected);
                } else {
                    $line->gudangs()->sync([]);
                }
            }

            $statuses = $decisionMap->pluck('status')->unique();
            $overall  = $statuses->count() === 1 ? $statuses->first() : 'partially_approved';

            $submission->update([
                'status'      => $overall,
                'reviewed_by' => $user->Email,
                'reviewed_at' => now(),
                'review_note' => $validated['review_note'] ?? null,
            ]);
        });

        return response()->json($submission->fresh()->load(['lines.gudangs']));
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────

    private function gudangOptionsFor(string $region, int $kecamatanId)
    {
        return GudangSubmission::where('status', 'approved')
            ->whereHas('region', fn ($q) => $q->where('nama_reg', $region))
            ->whereHas('kecamatans', fn ($q) => $q->where('kecamatan.id', $kecamatanId))
            ->get(['id', 'nama_gudang', 'alamat_gudang']);
    }

    /**
     * Rekap pesanan yang sudah dibayar & belum dibatalkan di region ini, dikurangi
     * pasangan (order_id, product_id) yang sudah tercakup ajuan SO lain yang belum
     * ditolak — lalu dikelompokkan per (kecamatan, produk).
     */
    private function buildRecapGroups(string $region): \Illuminate\Support\Collection
    {
        $alreadyCovered = SoSubmissionLineOrder::whereHas('line', fn ($q) => $q->where('status', '!=', 'rejected'))
            ->get(['order_id', 'product_id'])
            ->map(fn ($r) => $r->order_id . '|' . $r->product_id)
            ->flip();

        $orders = Order::whereNotNull('PaidAt')
            ->where(fn ($q) => $q->whereNull('OrderStatus')->orWhere('OrderStatus', '!=', 'cancelled'))
            ->whereIn('UserEmail', function ($q) use ($region) {
                $q->select('Email')->from('Users')->where('Role', 'kiosk')->where('Region', $region);
            })
            ->with('items')
            ->get();

        $groups = [];

        foreach ($orders as $order) {
            $kiosk = OrderController::resolveKiosk($order);
            if (! $kiosk?->KecamatanId) {
                continue;
            }

            foreach ($order->items->groupBy('ProductId') as $productId => $itemRows) {
                if (isset($alreadyCovered[$order->Id . '|' . $productId])) {
                    continue;
                }

                $first = $itemRows->first();
                $qty   = (float) $itemRows->sum('Quantity');
                $key   = $kiosk->KecamatanId . '|' . $productId;

                if (! isset($groups[$key])) {
                    $groups[$key] = [
                        'kecamatan_id'   => $kiosk->KecamatanId,
                        'kecamatan_nama' => $kiosk->kecamatan?->nama_kec,
                        'kabupaten_id'   => $kiosk->kecamatan?->kabupaten?->id,
                        'kabupaten_nama' => $kiosk->kecamatan?->kabupaten?->nama_kab,
                        'product_id'     => (int) $productId,
                        'product_code'   => $first->productCode,
                        'product_name'   => $first->ProductName,
                        'unit'           => $first->Unit,
                        'total_quantity' => 0.0,
                        'covered'        => [],
                    ];
                }

                $groups[$key]['total_quantity'] += $qty;
                $groups[$key]['covered'][] = ['order_id' => $order->Id, 'quantity' => $qty];
            }
        }

        return collect(array_values($groups));
    }
}
