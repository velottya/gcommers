<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\TransportPartnerRate;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class TransportPartnerRateController extends Controller
{
    // ── Daftar mitra transportir + tarif region ini (kalau sudah diatur) ─────

    public function index(Request $request)
    {
        $user = Auth::user();
        abort_unless(in_array($user->Role, ['AdminRegion', 'SuperAdmin'], true), 403);

        $region = $user->Role === 'AdminRegion' ? $user->Region : $request->input('region');
        abort_unless($region, 422, 'Region tidak ditemukan.');

        $companies = User::where('Role', 'transportir')
            ->whereNotNull('CompanyName')
            ->where('CompanyName', '!=', '')
            ->distinct()
            ->orderBy('CompanyName')
            ->pluck('CompanyName');

        $rates = TransportPartnerRate::where('region', $region)->get()->keyBy('company_name');

        $result = $companies->map(function ($company) use ($rates) {
            $rate = $rates->get($company);

            return [
                'company_name'         => $company,
                'shipping_cost_per_kg' => $rate ? (float) $rate->shipping_cost_per_kg : null,
                'updated_at'           => $rate?->updated_at,
            ];
        });

        return response()->json($result->values());
    }

    // ── Set/ubah tarif satu mitra untuk region AdminRegion ini ───────────────

    public function store(Request $request)
    {
        $user = Auth::user();
        abort_unless($user->Role === 'AdminRegion', 403);

        $validated = $request->validate([
            'company_name'         => 'required|string|max:200',
            'shipping_cost_per_kg' => 'required|numeric|min:0',
        ]);

        $rate = TransportPartnerRate::updateOrCreate(
            ['region' => $user->Region, 'company_name' => $validated['company_name']],
            ['shipping_cost_per_kg' => $validated['shipping_cost_per_kg'], 'set_by' => $user->Email]
        );

        return response()->json($rate);
    }
}
