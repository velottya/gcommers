<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Warehouse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class WarehouseController extends Controller
{
    public function index(Request $request)
    {
        $user  = Auth::user();
        $query = Warehouse::query();

        if ($user->Role === 'AdminTransport') {
            $query->where('company_name', trim($user->CompanyName ?? ''));
        } elseif ($user->Role === 'AdminRegion') {
            $query->where('region', trim($user->Region ?? ''));
        } elseif ($request->filled('region')) {
            $query->where('region', $request->region);
        }

        if ($request->filled('search')) {
            $s = $request->search;
            $query->where(fn ($q) => $q->where('name', 'like', "%{$s}%")->orWhere('address', 'like', "%{$s}%"));
        }

        return response()->json($query->orderBy('name')->get());
    }

    public function store(Request $request)
    {
        $user = Auth::user();
        $this->ensureCanManage($user);

        $data = $request->validate([
            'region'       => 'required|string|max:100',
            'company_name' => 'nullable|string|max:200',
            'name'         => 'required|string|max:200',
            'address'      => 'nullable|string|max:500',
            'lat'          => 'nullable|numeric|between:-90,90',
            'lng'          => 'nullable|numeric|between:-180,180',
        ]);

        if ($user->Role === 'AdminTransport') {
            $data['company_name'] = trim($user->CompanyName ?? '');
        }

        $warehouse = Warehouse::create($data);

        return response()->json($warehouse, 201);
    }

    public function update(Request $request, int $id)
    {
        $user = Auth::user();
        $this->ensureCanManage($user);

        $warehouse = $this->scopedQuery($user)->findOrFail($id);

        $data = $request->validate([
            'region'    => 'sometimes|string|max:100',
            'name'      => 'sometimes|string|max:200',
            'address'   => 'nullable|string|max:500',
            'lat'       => 'nullable|numeric|between:-90,90',
            'lng'       => 'nullable|numeric|between:-180,180',
            'is_active' => 'sometimes|boolean',
        ]);

        $warehouse->update($data);

        return response()->json($warehouse);
    }

    public function destroy(int $id)
    {
        $user = Auth::user();
        $this->ensureCanManage($user);

        $warehouse = $this->scopedQuery($user)->findOrFail($id);
        $warehouse->delete();

        return response()->noContent();
    }

    private function scopedQuery($user)
    {
        $query = Warehouse::query();

        if ($user->Role === 'AdminTransport') {
            $query->where('company_name', trim($user->CompanyName ?? ''));
        }

        return $query;
    }

    private function ensureCanManage($user): void
    {
        abort_unless(in_array($user->Role, ['SuperAdmin', 'AdminTransport'], true), 403, 'Akses tidak diizinkan.');
    }
}
