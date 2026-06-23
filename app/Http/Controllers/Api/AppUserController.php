<?php

namespace App\Http\Controllers\Api;

use App\Helpers\FlutterPasswordHasher;
use App\Http\Controllers\Controller;
use App\Models\Kecamatan;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

/**
 * Mengelola pengguna aplikasi Flutter (non-admin):
 *   - Kiosk       : Role = 'kiosk'
 *   - Transportir : Role = 'transportir'
 */
class AppUserController extends Controller
{
    // ─── Read ─────────────────────────────────────────────────────────────────

    public function kiosk(Request $request)
    {
        $this->ensureCanManageKiosk();
        $authUser = Auth::user();

        $query = User::where('Role', 'kiosk')->with(['propinsi', 'kabupaten', 'kecamatan']);

        // AdminRegion hanya melihat kiosk di region mereka sendiri
        if ($authUser->Role === 'AdminRegion') {
            $query->where('Region', $authUser->Region);
        } elseif ($request->filled('region')) {
            $query->where('Region', $request->region);
        }

        if ($request->filled('search')) {
            $s = $request->search;
            $query->where(fn ($q) =>
                $q->where('Email', 'like', "%{$s}%")
                  ->orWhere('DisplayName', 'like', "%{$s}%")
                  ->orWhere('KioskName', 'like', "%{$s}%")
                  ->orWhere('Kecamatan', 'like', "%{$s}%")
            );
        }

        $users = $query->orderBy('CreatedAt', 'desc')->paginate(20);
        $users->through(fn (User $u) => $this->formatKiosk($u));

        return response()->json($users);
    }

    public function transportir(Request $request)
    {
        $this->ensureCanManageTransportir();
        $authUser = Auth::user();

        // whereNotNull('Type') memisahkan app user dari admin AdminTransport yang juga ber-Role=transportir
        $query = User::where('Role', 'transportir')->whereNotNull('Type');

        // AdminTransport hanya melihat driver dari perusahaan mereka sendiri
        if ($authUser->Role === 'AdminTransport') {
            $query->where('CompanyName', $authUser->CompanyName);
        }

        if ($request->filled('search')) {
            $s = $request->search;
            $query->where(fn ($q) =>
                $q->where('Email', 'like', "%{$s}%")
                  ->orWhere('DisplayName', 'like', "%{$s}%")
                  ->orWhere('TransportirName', 'like', "%{$s}%")
                  ->orWhere('CompanyName', 'like', "%{$s}%")
            );
        }

        $users = $query->orderBy('CreatedAt', 'desc')->paginate(20);
        $users->through(fn (User $u) => $this->formatTransportir($u));

        return response()->json($users);
    }

    // ─── Create ───────────────────────────────────────────────────────────────

    public function storeKiosk(Request $request)
    {
        $this->ensureCanManageKiosk();
        $authUser = Auth::user();

        $data = $request->validate([
            'Email'       => ['required', 'email', 'max:255', Rule::unique('Users', 'Email')],
            'DisplayName' => 'required|string|max:200',
            'password'    => 'required|string|min:8',
            'Phone'       => 'nullable|string|max:50',
            'Address'     => 'nullable|string|max:500',
            'KioskName'   => 'nullable|string|max:200',
            'Region'      => ['nullable', Rule::in(array_merge([''], User::VALID_REGIONS))],
            'Kecamatan'   => 'nullable|string|max:150',
            'PicName'     => 'nullable|string|max:200',
            'ProvinsiId'  => 'nullable|integer|exists:propinsi,id',
            'KabupatenId' => 'nullable|integer|exists:kabupaten,id',
            'KecamatanId' => 'nullable|integer|exists:kecamatan,id',
            'Kelurahan'   => 'nullable|string|max:150',
            'KodePos'     => 'nullable|string|max:10',
            'Latitude'    => 'nullable|numeric|between:-90,90',
            'Longitude'   => 'nullable|numeric|between:-180,180',
        ]);

        // AdminRegion selalu membuat kiosk di region mereka sendiri
        if ($authUser->Role === 'AdminRegion') {
            $data['Region'] = $authUser->Region;
        }

        $this->syncKecamatanText($data);

        ['saltLiteral' => $saltLit, 'hashLiteral' => $hashLit] =
            FlutterPasswordHasher::hashToSqlLiterals($data['password']);

        $userId = DB::table('Users')->insertGetId([
            'Email'        => $data['Email'],
            'DisplayName'  => $data['DisplayName'],
            'KioskName'    => $data['KioskName'] ?? null,
            'Phone'        => $data['Phone'] ?? null,
            'Address'      => $data['Address'] ?? null,
            'Region'       => $data['Region'] ?? null,
            'Kecamatan'    => $data['Kecamatan'] ?? null,
            'PicName'      => $data['PicName'] ?? null,
            'ProvinsiId'   => $data['ProvinsiId'] ?? null,
            'KabupatenId'  => $data['KabupatenId'] ?? null,
            'KecamatanId'  => $data['KecamatanId'] ?? null,
            'Kelurahan'    => $data['Kelurahan'] ?? null,
            'KodePos'      => $data['KodePos'] ?? null,
            'Latitude'     => $data['Latitude'] ?? null,
            'Longitude'    => $data['Longitude'] ?? null,
            'Role'         => 'kiosk',
            'PasswordHash' => DB::raw($hashLit),
            'PasswordSalt' => DB::raw($saltLit),
            'CreatedAt'    => now(),
            'UpdatedAt'    => now(),
        ], 'Id');

        return response()->json($this->formatKiosk(User::findOrFail($userId)), 201);
    }

    public function storeTransportir(Request $request)
    {
        $this->ensureCanManageTransportir();
        $authUser = Auth::user();

        $data = $request->validate([
            'Email'           => ['required', 'email', 'max:255', Rule::unique('Users', 'Email')],
            'TransportirName' => 'required|string|max:200',
            'CompanyName'     => 'required|string|max:200',
            'Phone'           => 'required|string|max:50',
            'PoliceNumber'    => 'required|string|max:50',
            'Type'            => 'required|string|max:100',
            'password'        => 'required|string|min:8',
        ]);

        // AdminTransport selalu membuat driver di perusahaan mereka sendiri
        if ($authUser->Role === 'AdminTransport') {
            $data['CompanyName'] = $authUser->CompanyName;
        }

        ['saltLiteral' => $saltLit, 'hashLiteral' => $hashLit] =
            FlutterPasswordHasher::hashToSqlLiterals($data['password']);

        $userId = DB::table('Users')->insertGetId([
            'Email'           => $data['Email'],
            'DisplayName'     => $data['TransportirName'], // ikuti konvensi C#
            'TransportirName' => $data['TransportirName'],
            'CompanyName'     => $data['CompanyName'],
            'Phone'           => $data['Phone'],
            'PoliceNumber'    => $data['PoliceNumber'],
            'Type'            => $data['Type'],
            'Role'            => 'transportir',
            'PasswordHash'    => DB::raw($hashLit),
            'PasswordSalt'    => DB::raw($saltLit),
            'CreatedAt'       => now(),
            'UpdatedAt'       => now(),
        ], 'Id');

        return response()->json($this->formatTransportir(User::findOrFail($userId)), 201);
    }

    // ─── Update ───────────────────────────────────────────────────────────────

    public function update(Request $request, string $id)
    {
        $authUser         = Auth::user();
        $isSuperAdmin     = $authUser->Role === 'SuperAdmin';
        $isAdminRegion    = $authUser->Role === 'AdminRegion';
        $isAdminTransport = $authUser->Role === 'AdminTransport';

        abort_unless($isSuperAdmin || $isAdminRegion || $isAdminTransport, 403, 'Akses ditolak.');

        $query = User::where('Id', $id);
        if ($isSuperAdmin) {
            $query->whereIn('Role', ['kiosk', 'transportir']);
        } elseif ($isAdminRegion) {
            // AdminRegion hanya boleh edit kiosk di region mereka
            $query->where('Role', 'kiosk')->where('Region', $authUser->Region);
        } else {
            // AdminTransport hanya boleh edit driver di perusahaan mereka (bukan akun admin)
            $query->where('Role', 'transportir')
                  ->whereNotNull('Type')
                  ->where('CompanyName', $authUser->CompanyName);
        }
        $user = $query->firstOrFail();

        $isKiosk = $user->getRawOriginal('Role') === 'kiosk';

        if ($isKiosk) {
            $data = $request->validate([
                'DisplayName' => 'sometimes|string|max:200',
                'password'    => 'nullable|string|min:8',
                'Phone'       => 'nullable|string|max:50',
                'Address'     => 'nullable|string|max:500',
                'KioskName'   => 'nullable|string|max:200',
                'Region'      => ['nullable', Rule::in(array_merge([''], User::VALID_REGIONS))],
                'Kecamatan'   => 'nullable|string|max:150',
                'PicName'     => 'nullable|string|max:200',
                'ProvinsiId'  => 'nullable|integer|exists:propinsi,id',
                'KabupatenId' => 'nullable|integer|exists:kabupaten,id',
                'KecamatanId' => 'nullable|integer|exists:kecamatan,id',
                'Kelurahan'   => 'nullable|string|max:150',
                'KodePos'     => 'nullable|string|max:10',
                'Latitude'    => 'nullable|numeric|between:-90,90',
                'Longitude'   => 'nullable|numeric|between:-180,180',
            ]);

            // AdminRegion tidak boleh mengubah region kiosk
            if ($isAdminRegion) {
                unset($data['Region']);
            }

            $this->syncKecamatanText($data);
        } else {
            $data = $request->validate([
                'TransportirName' => 'sometimes|string|max:200',
                'CompanyName'     => 'sometimes|string|max:200',
                'Phone'           => 'sometimes|string|max:50',
                'PoliceNumber'    => 'sometimes|string|max:50',
                'Type'            => 'sometimes|string|max:100',
                'password'        => 'nullable|string|min:8',
            ]);

            // Sync DisplayName dengan TransportirName jika diubah
            if (isset($data['TransportirName'])) {
                $data['DisplayName'] = $data['TransportirName'];
            }

            // AdminTransport tidak boleh mengubah CompanyName driver
            if ($isAdminTransport) {
                unset($data['CompanyName']);
            }
        }

        // Update profil (tanpa password)
        $profileFields = collect($data)->except('password')->toArray();
        $user->fill($profileFields)->save();

        // Update password jika diisi
        if (!empty($data['password'])) {
            ['saltLiteral' => $saltLit, 'hashLiteral' => $hashLit] =
                FlutterPasswordHasher::hashToSqlLiterals($data['password']);

            DB::table('Users')->where('Id', $user->Id)->update([
                'PasswordHash' => DB::raw($hashLit),
                'PasswordSalt' => DB::raw($saltLit),
                'UpdatedAt'    => now(),
            ]);
        }

        $fresh = $user->fresh();

        return response()->json(
            $isKiosk ? $this->formatKiosk($fresh) : $this->formatTransportir($fresh)
        );
    }

    // ─── Delete ───────────────────────────────────────────────────────────────

    public function destroy(string $id)
    {
        $authUser         = Auth::user();
        $isSuperAdmin     = $authUser->Role === 'SuperAdmin';
        $isAdminRegion    = $authUser->Role === 'AdminRegion';
        $isAdminTransport = $authUser->Role === 'AdminTransport';

        abort_unless($isSuperAdmin || $isAdminRegion || $isAdminTransport, 403, 'Akses ditolak.');

        $query = User::where('Id', $id);
        if ($isSuperAdmin) {
            $query->whereIn('Role', ['kiosk', 'transportir']);
        } elseif ($isAdminRegion) {
            // AdminRegion hanya boleh hapus kiosk di region mereka
            $query->where('Role', 'kiosk')->where('Region', $authUser->Region);
        } else {
            // AdminTransport hanya boleh hapus driver di perusahaan mereka (bukan akun admin)
            $query->where('Role', 'transportir')
                  ->whereNotNull('Type')
                  ->where('CompanyName', $authUser->CompanyName);
        }

        $user = $query->firstOrFail();
        $user->delete();

        return response()->noContent();
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────

    private function ensureSuperAdmin(): void
    {
        abort_unless(Auth::user()?->Role === 'SuperAdmin', 403, 'Hanya SuperAdmin.');
    }

    private function ensureCanManageKiosk(): void
    {
        abort_unless(
            in_array(Auth::user()?->Role, ['SuperAdmin', 'AdminRegion'], true),
            403,
            'Akses ditolak.'
        );
    }

    private function ensureCanManageTransportir(): void
    {
        abort_unless(
            in_array(Auth::user()?->Role, ['SuperAdmin', 'AdminTransport'], true),
            403,
            'Akses ditolak.'
        );
    }

    // Sinkronkan kolom legacy `Kecamatan` (teks bebas) dengan KecamatanId terpilih,
    // supaya fitur lain yang masih bergantung padanya (mis. daftar kecamatan quota
    // subsidi/tarif biaya) tetap konsisten.
    private function syncKecamatanText(array &$data): void
    {
        if (empty($data['KecamatanId'])) {
            return;
        }

        $kecamatan = Kecamatan::find($data['KecamatanId']);
        if ($kecamatan) {
            $data['Kecamatan'] = $kecamatan->nama_kec;
        }
    }

    private function formatKiosk(User $u): array
    {
        return [
            'Id'          => $u->Id,
            'Email'       => (string) $u->Email,
            'DisplayName' => (string) $u->DisplayName,
            'Phone'       => $u->Phone ? (string) $u->Phone : null,
            'Address'     => $u->Address ? (string) $u->Address : null,
            'KioskName'   => $u->KioskName ? (string) $u->KioskName : null,
            'Region'      => $u->Region ? (string) $u->Region : null,
            'Kecamatan'   => $u->Kecamatan ? (string) $u->Kecamatan : null,
            'PicName'     => $u->PicName ? (string) $u->PicName : null,
            'ProvinsiId'  => $u->ProvinsiId,
            'KabupatenId' => $u->KabupatenId,
            'KecamatanId' => $u->KecamatanId,
            'Propinsi'    => $u->propinsi?->nama_pro,
            'Kabupaten'   => $u->kabupaten?->nama_kab,
            'KecamatanNama' => $u->kecamatan?->nama_kec,
            'Kelurahan'   => $u->Kelurahan,
            'KodePos'     => $u->KodePos,
            'Latitude'    => $u->Latitude,
            'Longitude'   => $u->Longitude,
            'CreatedAt'   => $u->CreatedAt,
        ];
    }

    private function formatTransportir(User $u): array
    {
        return [
            'Id'              => $u->Id,
            'Email'           => (string) $u->Email,
            'DisplayName'     => (string) $u->DisplayName,
            'Phone'           => $u->Phone ? (string) $u->Phone : null,
            'Address'         => $u->Address ? (string) $u->Address : null,
            'TransportirName' => $u->TransportirName ? (string) $u->TransportirName : null,
            'CompanyName'     => $u->CompanyName ? (string) $u->CompanyName : null,
            'PoliceNumber'    => $u->PoliceNumber ? (string) $u->PoliceNumber : null,
            'Type'            => $u->Type ? (string) $u->Type : null,
            'PicName'         => $u->PicName ? (string) $u->PicName : null,
            'CreatedAt'       => $u->CreatedAt,
        ];
    }
}
