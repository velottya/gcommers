<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SubsidyQuota;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class SubsidyQuotaController extends Controller
{
    public function index(Request $request)
    {
        $user  = Auth::user();
        $query = SubsidyQuota::query();

        if ($user->Role === 'AdminRegion' && $user->Region) {
            $query->where('region', $user->Region);
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('period')) {
            $query->where('period', $request->period);
        }

        if ($request->filled('region')) {
            $query->where('region', 'like', '%' . $request->region . '%');
        }

        $quotas = $query->orderBy('period', 'desc')->orderBy('region')->paginate(20);

        return response()->json($quotas);
    }

    public function store(Request $request)
    {
        $user = Auth::user();
        $this->ensureCanManage($user);

        $data = $request->validate([
            'region'       => 'required|string|max:255',
            'kiosk_email'  => 'nullable|email|max:255',
            'product_code' => 'nullable|string|max:100',
            'quota_kg'     => 'required|numeric|min:0',
            'period'       => ['required', 'regex:/^\d{4}-\d{2}$/'],
        ]);

        if ($user->Role === 'AdminRegion') {
            $data['region'] = $user->Region;
        }

        $data['created_by'] = $user->Email;
        $data['status']     = 'draft';

        $quota = SubsidyQuota::create($data);

        return response()->json($quota, 201);
    }

    public function update(Request $request, int $id)
    {
        $user  = Auth::user();
        $this->ensureCanManage($user);

        $quota = $this->findAccessible($id, $user);
        abort_unless($quota->status === 'draft', 422, 'Hanya quota berstatus draft yang bisa diedit.');

        $data = $request->validate([
            'region'       => 'sometimes|required|string|max:255',
            'kiosk_email'  => 'nullable|email|max:255',
            'product_code' => 'nullable|string|max:100',
            'quota_kg'     => 'sometimes|required|numeric|min:0',
            'period'       => ['sometimes', 'required', 'regex:/^\d{4}-\d{2}$/'],
        ]);

        if ($user->Role === 'AdminRegion') {
            unset($data['region']);
        }

        $quota->update($data);

        return response()->json($quota->fresh());
    }

    public function destroy(int $id)
    {
        $user  = Auth::user();
        $this->ensureCanManage($user);

        $quota = $this->findAccessible($id, $user);
        $quota->delete();

        return response()->noContent();
    }

    public function submit(int $id)
    {
        $user  = Auth::user();
        abort_unless($user->Role === 'AdminRegion', 403, 'Akses tidak diizinkan.');

        $quota = SubsidyQuota::where('region', trim($user->Region ?? ''))->findOrFail($id);
        abort_unless($quota->status === 'draft', 422, 'Quota ini sudah diajukan atau sudah diproses.');

        $quota->update(['status' => 'submitted']);

        return response()->json($quota->fresh());
    }

    public function approve(Request $request, int $id)
    {
        $user = Auth::user();
        abort_unless($user->Role === 'SuperAdmin', 403, 'Akses tidak diizinkan.');

        $quota = SubsidyQuota::findOrFail($id);
        abort_unless($quota->status === 'submitted', 422, 'Quota belum diajukan.');

        $quota->update([
            'status'      => 'approved',
            'reviewed_by' => $user->Email,
            'reviewed_at' => now(),
            'review_note' => $request->input('review_note'),
        ]);

        return response()->json($quota->fresh());
    }

    public function reject(Request $request, int $id)
    {
        $user = Auth::user();
        abort_unless($user->Role === 'SuperAdmin', 403, 'Akses tidak diizinkan.');

        $quota = SubsidyQuota::findOrFail($id);
        abort_unless($quota->status === 'submitted', 422, 'Quota belum diajukan.');

        $data = $request->validate(['review_note' => 'nullable|string|max:1000']);

        $quota->update([
            'status'      => 'rejected',
            'reviewed_by' => $user->Email,
            'reviewed_at' => now(),
            'review_note' => $data['review_note'] ?? null,
        ]);

        return response()->json($quota->fresh());
    }

    private function ensureCanManage($user): void
    {
        abort_unless(
            in_array($user->Role, ['SuperAdmin', 'AdminRegion'], true),
            403,
            'Akses tidak diizinkan.'
        );
    }

    private function findAccessible(int $id, $user): SubsidyQuota
    {
        $query = SubsidyQuota::query();

        if ($user->Role === 'AdminRegion' && $user->Region) {
            $query->where('region', $user->Region);
        }

        return $query->findOrFail($id);
    }
}
