<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Kabupaten;
use App\Models\Region;
use App\Models\TransportPartnerRate;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class TransportPartnerRateController extends Controller
{
    // ── Daftar mitra transportir + tarif default (region) ────────────────────

    public function index(Request $request)
    {
        $user = Auth::user();
        abort_unless(in_array($user->Role, ['AdminRegion', 'SuperAdmin'], true), 403);

        $region = $user->Role === 'AdminRegion' ? $user->Region : $request->input('region');
        abort_unless($region, 422, 'Region tidak ditemukan.');

        // Users.Role di DB menyimpan nilai mentah ('transportir' untuk AdminTransport,
        // lihat User::ADMIN_ROLE_STORAGE_MAP) — Type NULL membedakan akun level
        // perusahaan dari akun sopir/truk perorangan (Type terisi), pola yang sama
        // dipakai OrderController::coveredTransportPartners().
        $companies = User::where('Role', User::ADMIN_ROLE_STORAGE_MAP['AdminTransport'])
            ->whereNull('Type')
            ->where('Region', $region)
            ->whereNotNull('CompanyName')
            ->where('CompanyName', '!=', '')
            ->distinct()
            ->orderBy('CompanyName')
            ->pluck('CompanyName');

        // kecamatan_id NULL = tarif default per-region (bukan tarif per-kecamatan).
        $rates = TransportPartnerRate::where('region', $region)
            ->whereNull('kecamatan_id')
            ->get()
            ->keyBy('company_name');

        $kecamatanCounts = TransportPartnerRate::where('region', $region)
            ->whereNotNull('kecamatan_id')
            ->selectRaw('company_name, COUNT(*) as cnt')
            ->groupBy('company_name')
            ->pluck('cnt', 'company_name');

        $result = $companies->map(function ($company) use ($rates, $kecamatanCounts) {
            $rate = $rates->get($company);

            return [
                'company_name'          => $company,
                'shipping_cost_per_kg'  => $rate ? (float) $rate->shipping_cost_per_kg : null,
                'updated_at'            => $rate?->updated_at,
                'kecamatan_rate_count'  => (int) ($kecamatanCounts->get($company) ?? 0),
            ];
        });

        return response()->json($result->values());
    }

    // ── Set/ubah tarif default satu mitra untuk region AdminRegion ini ───────

    public function store(Request $request)
    {
        $user = Auth::user();
        abort_unless($user->Role === 'AdminRegion', 403);

        $validated = $request->validate([
            'company_name'         => 'required|string|max:200',
            'shipping_cost_per_kg' => 'required|numeric|min:0',
        ]);

        $rate = TransportPartnerRate::updateOrCreate(
            ['region' => $user->Region, 'company_name' => $validated['company_name'], 'kecamatan_id' => null],
            ['shipping_cost_per_kg' => $validated['shipping_cost_per_kg'], 'set_by' => $user->Email]
        );

        return response()->json($rate);
    }

    // ── Daftar kecamatan di region ini + tarif khusus mitra (kalau ada) ──────

    public function kecamatanRates(Request $request)
    {
        $user = Auth::user();
        abort_unless($user->Role === 'AdminRegion', 403);

        $company = $request->query('company');
        abort_unless($company, 422, 'Mitra tidak ditemukan.');

        $regionName = $user->Region;
        $region     = Region::where('nama_reg', $regionName)->first();
        abort_unless($region, 422, "Data wilayah untuk region {$regionName} belum tersedia.");

        // Pola pencocokan kabupaten sama seperti GudangSubmissionController::wilayah().
        $kabupatens = Kabupaten::with('kecamatans')
            ->where(function ($q) use ($region) {
                $q->where('id_reg', $region->id)
                  ->orWhere(function ($q2) use ($region) {
                      $q2->whereNull('id_reg')
                         ->whereHas('propinsi', fn ($q3) => $q3->where('id_reg', $region->id));
                  });
            })
            ->orderBy('nama_kab')
            ->get();

        $rates = TransportPartnerRate::where('region', $regionName)
            ->where('company_name', $company)
            ->whereNotNull('kecamatan_id')
            ->pluck('shipping_cost_per_kg', 'kecamatan_id');

        $defaultRate = TransportPartnerRate::where('region', $regionName)
            ->where('company_name', $company)
            ->whereNull('kecamatan_id')
            ->value('shipping_cost_per_kg');

        return response()->json([
            'company_name' => $company,
            'default_rate' => $defaultRate !== null ? (float) $defaultRate : null,
            'kabupatens'   => $kabupatens->map(fn (Kabupaten $k) => [
                'id'         => $k->id,
                'nama_kab'   => $k->nama_kab,
                'kecamatans' => $k->kecamatans->map(fn ($c) => [
                    'id'                   => $c->id,
                    'nama_kec'             => $c->nama_kec,
                    'shipping_cost_per_kg' => $rates->has($c->id) ? (float) $rates->get($c->id) : null,
                ])->values(),
            ])->values(),
        ]);
    }

    // ── Simpan tarif khusus per kecamatan (borongan) untuk satu mitra ────────

    public function saveKecamatanRates(Request $request)
    {
        $user = Auth::user();
        abort_unless($user->Role === 'AdminRegion', 403);

        $validated = $request->validate([
            'company_name'                       => 'required|string|max:200',
            'rates'                               => 'required|array',
            'rates.*.kecamatan_id'                => 'required|integer|exists:kecamatan,id',
            'rates.*.shipping_cost_per_kg'        => 'nullable|numeric|min:0',
        ]);

        foreach ($validated['rates'] as $row) {
            if ($row['shipping_cost_per_kg'] === null || $row['shipping_cost_per_kg'] === '') {
                // Kosong = reset ke tarif default region (hapus baris kecamatan-nya).
                TransportPartnerRate::where('region', $user->Region)
                    ->where('company_name', $validated['company_name'])
                    ->where('kecamatan_id', $row['kecamatan_id'])
                    ->delete();

                continue;
            }

            TransportPartnerRate::updateOrCreate(
                [
                    'region'       => $user->Region,
                    'company_name' => $validated['company_name'],
                    'kecamatan_id' => $row['kecamatan_id'],
                ],
                [
                    'shipping_cost_per_kg' => $row['shipping_cost_per_kg'],
                    'set_by'               => $user->Email,
                ]
            );
        }

        return response()->json(['status' => 'ok']);
    }
}
