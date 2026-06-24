<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\GudangSubmission;
use App\Models\Kabupaten;
use App\Models\Region;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class GudangSubmissionController extends Controller
{
    public function index(Request $request)
    {
        $user  = Auth::user();
        $query = GudangSubmission::with(['region', 'propinsi', 'kecamatans.kabupaten']);

        if ($user->Role === 'AdminRegion') {
            $query->whereHas('region', fn ($q) => $q->where('nama_reg', $user->Region));
        } elseif ($user->Role === 'AdminTransport') {
            // Hanya gudang yang wilayah cakupannya beririsan dengan wilayah kerja
            // AdminTransport ini sendiri (lihat User::kecamatans()). Kalau wilayah
            // kerjanya belum diatur SuperAdmin, hasilnya kosong (bukan "semua gudang").
            $kecamatanIds = $user->kecamatans->pluck('id');
            $query->whereHas('kecamatans', fn ($q) => $q->whereIn('kecamatan.id', $kecamatanIds));
        } elseif ($request->filled('region_id')) {
            $query->where('region_id', $request->region_id);
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('search')) {
            $s = $request->search;
            $query->where(fn ($q) => $q->where('nama_gudang', 'like', "%{$s}%")->orWhere('nama_pic', 'like', "%{$s}%"));
        }

        return response()->json($query->orderByDesc('created_at')->get());
    }

    // ── Pohon wilayah (propinsi → kabupaten → kecamatan) per region ─────────

    public function wilayah(Request $request)
    {
        $user = Auth::user();
        abort_unless(in_array($user->Role, ['AdminRegion', 'SuperAdmin'], true), 403);

        // AdminRegion selalu pakai region miliknya sendiri; SuperAdmin (mis. saat
        // mengatur wilayah kerja AdminTransport) wajib mengirim ?region=.
        $regionName = $user->Role === 'AdminRegion' ? $user->Region : $request->query('region');
        abort_unless($regionName, 422, 'Region wajib diisi.');

        $region = Region::where('nama_reg', $regionName)->first();
        abort_unless($region, 422, "Data wilayah untuk region {$regionName} belum tersedia.");

        // Untuk propinsi yang terbagi ke 2 region (mis. "Jawa Tengah" -> "Jawa
        // Tengah Selatan"/"Jawa Tengah Utara"), kabupaten.id_reg diisi per-baris
        // dan propinsi.id_reg sengaja NULL. Untuk propinsi normal (1 propinsi =
        // 1 region), kabupaten.id_reg NULL semua dan region-nya ikut propinsi.id_reg.
        // Jadi kabupaten cocok kalau: id_reg-nya sendiri match, ATAU id_reg-nya
        // NULL dan propinsi induknya match.
        $kabupatens = Kabupaten::with(['kecamatans', 'propinsi'])
            ->where(function ($q) use ($region) {
                $q->where('id_reg', $region->id)
                  ->orWhere(function ($q2) use ($region) {
                      $q2->whereNull('id_reg')
                         ->whereHas('propinsi', fn ($q3) => $q3->where('id_reg', $region->id));
                  });
            })
            ->orderBy('nama_kab')
            ->get();

        $propinsis = $kabupatens
            ->groupBy('id_pro')
            ->map(function ($group) {
                $propinsi = $group->first()->propinsi;

                return [
                    'id'         => $propinsi->id,
                    'nama_pro'   => $propinsi->nama_pro,
                    'kabupatens' => $group->map(fn (Kabupaten $k) => [
                        'id'         => $k->id,
                        'nama_kab'   => $k->nama_kab,
                        'kecamatans' => $k->kecamatans->map(fn ($c) => [
                            'id'       => $c->id,
                            'nama_kec' => $c->nama_kec,
                        ])->values(),
                    ])->values(),
                ];
            })
            ->sortBy('nama_pro')
            ->values();

        return response()->json([
            'id'        => $region->id,
            'nama_reg'  => $region->nama_reg,
            'propinsis' => $propinsis,
        ]);
    }

    public function store(Request $request)
    {
        $user = Auth::user();
        abort_unless($user->Role === 'AdminRegion', 403);

        $validated    = $this->validatePayload($request);
        $kecamatanIds = $validated['kecamatan_ids'];
        unset($validated['kecamatan_ids']);

        $region = Region::where('nama_reg', $user->Region)->first();
        abort_if($region === null, 422, "Data wilayah untuk region {$user->Region} belum tersedia.");

        $submission = GudangSubmission::create([
            ...$validated,
            'region_id'    => $region->id,
            'status'       => 'pending',
            'submitted_by' => $user->Email,
        ]);

        $submission->kecamatans()->sync($kecamatanIds);

        return response()->json($submission->load(['region', 'propinsi', 'kecamatans.kabupaten']), 201);
    }

    public function update(Request $request, int $id)
    {
        $user       = Auth::user();
        abort_unless($user->Role === 'AdminRegion', 403);

        $submission = GudangSubmission::whereHas('region', fn ($q) => $q->where('nama_reg', $user->Region))
            ->findOrFail($id);

        abort_unless(in_array($submission->status, ['pending', 'rejected'], true), 422, 'Ajuan ini sudah disetujui, tidak bisa diubah.');

        $validated    = $this->validatePayload($request);
        $kecamatanIds = $validated['kecamatan_ids'];
        unset($validated['kecamatan_ids']);

        $submission->update([...$validated, 'status' => 'pending']);
        $submission->kecamatans()->sync($kecamatanIds);

        return response()->json($submission->fresh()->load(['region', 'propinsi', 'kecamatans.kabupaten']));
    }

    public function destroy(int $id)
    {
        $user       = Auth::user();
        abort_unless($user->Role === 'AdminRegion', 403);

        $submission = GudangSubmission::whereHas('region', fn ($q) => $q->where('nama_reg', $user->Region))
            ->findOrFail($id);

        abort_unless(in_array($submission->status, ['pending', 'rejected'], true), 422, 'Ajuan yang sudah disetujui tidak bisa dihapus.');

        $submission->delete();

        return response()->noContent();
    }

    // ── Tinjau: setujui ajuan gudang (SuperAdmin) ────────────────────────────

    public function approve(Request $request, int $id)
    {
        $user = Auth::user();
        abort_unless($user->Role === 'SuperAdmin', 403);

        $submission = GudangSubmission::findOrFail($id);
        abort_unless($submission->status === 'pending', 422, 'Ajuan ini sudah diproses.');

        $validated = $request->validate([
            'review_note' => 'nullable|string|max:1000',
        ]);

        $submission->update([
            'status'      => 'approved',
            'reviewed_by' => $user->Email,
            'reviewed_at' => now(),
            'review_note' => $validated['review_note'] ?? null,
        ]);

        return response()->json($submission->fresh()->load(['region', 'propinsi', 'kecamatans.kabupaten']));
    }

    // ── Tinjau: tolak ajuan gudang (SuperAdmin) ──────────────────────────────

    public function reject(Request $request, int $id)
    {
        $user = Auth::user();
        abort_unless($user->Role === 'SuperAdmin', 403);

        $submission = GudangSubmission::findOrFail($id);
        abort_unless($submission->status === 'pending', 422, 'Ajuan ini sudah diproses.');

        $validated = $request->validate([
            'review_note' => 'nullable|string|max:1000',
        ]);

        $submission->update([
            'status'      => 'rejected',
            'reviewed_by' => $user->Email,
            'reviewed_at' => now(),
            'review_note' => $validated['review_note'] ?? null,
        ]);

        return response()->json($submission->fresh()->load(['region', 'propinsi', 'kecamatans.kabupaten']));
    }

    private function validatePayload(Request $request): array
    {
        return $request->validate([
            'nama_gudang'      => 'required|string|max:200',
            'nama_pic'         => 'required|string|max:150',
            'no_telp'          => 'required|string|max:20',
            'alamat_gudang'    => 'nullable|string|max:500',
            'kelurahan'        => 'nullable|string|max:150',
            'kode_pos'         => 'nullable|string|max:10',
            'latitude'         => 'nullable|numeric|between:-90,90',
            'longitude'        => 'nullable|numeric|between:-180,180',
            'propinsi_id'      => 'required|integer|exists:propinsi,id',
            'kecamatan_ids'    => 'required|array|min:1',
            'kecamatan_ids.*'  => 'integer|distinct|exists:kecamatan,id',
        ]);
    }
}
