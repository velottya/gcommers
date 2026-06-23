<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\GudangSubmission;
use App\Models\Region;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class GudangSubmissionController extends Controller
{
    public function index(Request $request)
    {
        $user  = Auth::user();
        $query = GudangSubmission::with(['region', 'propinsi', 'kabupaten', 'kecamatan']);

        if ($user->Role === 'AdminRegion') {
            $query->whereHas('region', fn ($q) => $q->where('nama_reg', $user->Region));
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

    // ── Pohon wilayah (propinsi → kabupaten → kecamatan) untuk region AdminRegion ──

    public function wilayah()
    {
        $user = Auth::user();
        abort_unless($user->Role === 'AdminRegion', 403);

        $region = Region::with('propinsis.kabupatens.kecamatans')
            ->where('nama_reg', $user->Region)
            ->first();

        return response()->json($region);
    }

    public function store(Request $request)
    {
        $user = Auth::user();
        abort_unless($user->Role === 'AdminRegion', 403);

        $validated = $this->validatePayload($request);

        $region = Region::where('nama_reg', $user->Region)->first();
        abort_if($region === null, 422, "Data wilayah untuk region {$user->Region} belum tersedia.");

        $submission = GudangSubmission::create([
            ...$validated,
            'region_id'    => $region->id,
            'status'       => 'pending',
            'submitted_by' => $user->Email,
        ]);

        return response()->json($submission->load(['region', 'propinsi', 'kabupaten', 'kecamatan']), 201);
    }

    public function update(Request $request, int $id)
    {
        $user       = Auth::user();
        abort_unless($user->Role === 'AdminRegion', 403);

        $submission = GudangSubmission::whereHas('region', fn ($q) => $q->where('nama_reg', $user->Region))
            ->findOrFail($id);

        abort_unless(in_array($submission->status, ['pending', 'rejected'], true), 422, 'Ajuan ini sudah disetujui, tidak bisa diubah.');

        $validated = $this->validatePayload($request);

        $submission->update([...$validated, 'status' => 'pending']);

        return response()->json($submission->fresh()->load(['region', 'propinsi', 'kabupaten', 'kecamatan']));
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

        return response()->json($submission->fresh()->load(['region', 'propinsi', 'kabupaten', 'kecamatan']));
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

        return response()->json($submission->fresh()->load(['region', 'propinsi', 'kabupaten', 'kecamatan']));
    }

    private function validatePayload(Request $request): array
    {
        return $request->validate([
            'nama_gudang'   => 'required|string|max:200',
            'nama_pic'      => 'required|string|max:150',
            'no_telp'       => 'required|string|max:20',
            'alamat_gudang' => 'nullable|string|max:500',
            'kelurahan'     => 'nullable|string|max:150',
            'kode_pos'      => 'nullable|string|max:10',
            'latitude'      => 'nullable|numeric|between:-90,90',
            'longitude'     => 'nullable|numeric|between:-180,180',
            'propinsi_id'   => 'required|integer|exists:propinsi,id',
            'kabupaten_id'  => 'required|integer|exists:kabupaten,id',
            'kecamatan_id'  => 'required|integer|exists:kecamatan,id',
        ]);
    }
}
