<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AdminCredential;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class UserController extends Controller
{
    public function me()
    {
        $user = Auth::user();

        return response()->json($this->userPayload($user));
    }

    public function index(Request $request)
    {
        $currentUser = Auth::user();

        // Exclude transportir (AdminTransport+Type=Truk) — dikelola di AppUserController
        $query = User::whereIn('Role', User::adminRoleDatabaseValues())
            ->where(fn ($q) => $q->whereNull('Type')->orWhere('Type', '!=', 'Truk'));

        // AdminRegion hanya melihat user di region-nya
        if ($currentUser->Role === 'AdminRegion' && $currentUser->Region) {
            $query->where('Region', $currentUser->Region);
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('Email', 'like', "%{$search}%")
                  ->orWhere('DisplayName', 'like', "%{$search}%");
            });
        }

        if ($request->filled('role')) {
            $query->where('Role', User::normalizeAdminRoleForStorage($request->role));
        }

        $users = $query->orderBy('CreatedAt', 'desc')->paginate(20);
        $users->getCollection()->transform(fn (User $user) => $this->userPayload($user));

        return response()->json($users);
    }

    public function show(string $id)
    {
        return response()->json($this->userPayload($this->findAccessibleUser($id)));
    }

    public function store(Request $request)
    {
        $this->ensureSuperAdmin();

        $data = $this->validatePayload($request, false);
        $kecamatanIds = $data['kecamatan_ids'] ?? [];
        unset($data['kecamatan_ids']);

        $passwordHash = Hash::make($data['password']);
        $passwordData = $this->buildPasswordColumns($passwordHash, Str::random(32));

        $user = DB::transaction(function () use ($data, $passwordData, $passwordHash, $kecamatanIds) {
            $user = User::create(collect($data)
                ->except(['password'])
                ->merge($passwordData)
                ->all());

            AdminCredential::updateOrCreate(
                ['user_id' => (string) $user->Id],
                ['password' => $passwordHash]
            );

            if ($user->Role === 'AdminTransport') {
                $user->kecamatans()->sync($kecamatanIds);
            }

            return $user;
        });

        return response()->json($this->userPayload($user->fresh()), 201);
    }

    public function update(Request $request, string $id)
    {
        $this->ensureSuperAdmin();

        $user = $this->findAccessibleUser($id);
        $data = $this->validatePayload($request, true, $user);
        $kecamatanIds = $data['kecamatan_ids'] ?? null;
        unset($data['kecamatan_ids']);

        DB::transaction(function () use ($user, $data, $kecamatanIds) {
            $user->update(collect($data)->except(['password'])->all());

            if ($user->Role === 'AdminTransport' && $kecamatanIds !== null) {
                $user->kecamatans()->sync($kecamatanIds);
            }

            if (filled($data['password'] ?? null)) {
                $passwordHash = Hash::make($data['password']);
                $passwordData = $this->buildPasswordColumns($passwordHash, Str::random(32));

                $user->update($passwordData);

                AdminCredential::updateOrCreate(
                    ['user_id' => (string) $user->Id],
                    ['password' => $passwordHash]
                );
            }
        });

        return response()->json($this->userPayload($user->fresh()));
    }

    public function destroy(string $id)
    {
        $this->ensureSuperAdmin();

        $user = $this->findAccessibleUser($id);

        DB::transaction(function () use ($user) {
            AdminCredential::where('user_id', (string) $user->Id)->delete();
            $user->delete();
        });

        return response()->noContent();
    }

    private function validatePayload(Request $request, bool $isUpdate, ?User $currentUser = null): array
    {
        $validated = $request->validate([
            'Email' => [
                'required',
                'email',
                Rule::unique('Users', 'Email')->ignore($currentUser?->Id, 'Id'),
            ],
            'DisplayName' => ['required', 'string', 'max:255'],
            'Role' => ['required', Rule::in(User::ADMIN_ROLES)],
            'Phone' => ['nullable', 'string', 'max:50'],
            'Region' => [
                'nullable',
                Rule::in(array_merge([''], User::VALID_REGIONS)),
            ],
            'CompanyName' => ['nullable', 'string', 'max:255'],
            'TransportirName' => ['nullable', 'string', 'max:255'],
            'PoliceNumber' => ['nullable', 'string', 'max:100'],
            'PicName' => ['nullable', 'string', 'max:255'],
            'password' => [$isUpdate ? 'nullable' : 'required', 'string', 'min:8'],
            'kecamatan_ids' => ['sometimes', 'array'],
            'kecamatan_ids.*' => ['integer', 'distinct', 'exists:kecamatan,id'],
        ]);

        if ($validated['Role'] === 'AdminRegion') {
            $validated['Region'] = $validated['Region'] ?? '';
        }

        if ($validated['Role'] === 'AdminTransport') {
            $validated['CompanyName'] = $validated['CompanyName'] ?? '';
            $validated['TransportirName'] = $validated['TransportirName'] ?? '';
            $validated['PoliceNumber'] = $validated['PoliceNumber'] ?? '';
            $validated['Region'] = $validated['Region'] ?? '';
        }

        if ($validated['Role'] === 'SuperAdmin') {
            $validated['Region'] = null;
            $validated['CompanyName'] = null;
            $validated['TransportirName'] = null;
            $validated['PoliceNumber'] = null;
            $validated['PicName'] = $validated['PicName'] ?? null;
        }

        $validated['Role'] = User::normalizeAdminRoleForStorage($validated['Role']);

        return $validated;
    }

    private function findAccessibleUser(string $id): User
    {
        $query = User::whereIn('Role', User::adminRoleDatabaseValues());
        $currentUser = Auth::user();

        if ($currentUser->Role === 'AdminRegion' && $currentUser->Region) {
            $query->where('Region', $currentUser->Region);
        }

        return $query->where('Id', $id)->firstOrFail();
    }

    private function ensureSuperAdmin(): void
    {
        $user = Auth::user();

        abort_unless($user && $user->Role === 'SuperAdmin', 403, 'Akses tidak diizinkan.');
    }

    private function buildPasswordColumns(string $passwordHash, string $passwordSalt): array
    {
        return [
            'PasswordHash' => DB::raw($this->toVarbinaryExpression($passwordHash)),
            'PasswordSalt' => DB::raw($this->toVarbinaryExpression($passwordSalt)),
        ];
    }

    private function toVarbinaryExpression(string $value): string
    {
        $escapedValue = str_replace("'", "''", $value);

        return "CONVERT(VARBINARY(MAX), '{$escapedValue}')";
    }

    private function userPayload(User $user): array
    {
        $credential = AdminCredential::where('user_id', (string) $user->Id)->first();

        $payload = [
            'Id' => $user->Id,
            'Email' => (string) $user->Email,
            'DisplayName' => (string) $user->DisplayName,
            'Role' => (string) $user->Role,
            'Region' => $user->Region !== null ? (string) $user->Region : null,
            'CompanyName' => $user->CompanyName !== null ? (string) $user->CompanyName : null,
            'TransportirName' => $user->TransportirName !== null ? (string) $user->TransportirName : null,
            'PoliceNumber' => $user->PoliceNumber !== null ? (string) $user->PoliceNumber : null,
            'Phone' => $user->Phone !== null ? (string) $user->Phone : null,
            'Address' => $user->Address !== null ? (string) $user->Address : null,
            'PicName' => $user->PicName !== null ? (string) $user->PicName : null,
            'CreatedAt' => optional($user->CreatedAt)->toISOString(),
            'UpdatedAt' => optional($user->UpdatedAt)->toISOString(),
            'LastLoginAt' => optional($credential?->last_login_at)->toISOString(),
        ];

        if ($user->Role === 'AdminRegion' && $user->Region) {
            $payload['KioskCount'] = User::where('Role', 'kiosk')->where('Region', $user->Region)->count();
        }

        if ($user->Role === 'AdminTransport' && $user->CompanyName) {
            $payload['DriverCount'] = User::where('Role', 'transportir')
                ->whereNotNull('Type')
                ->where('CompanyName', $user->CompanyName)
                ->count();
        }

        if ($user->Role === 'AdminTransport') {
            $payload['Kecamatans'] = $user->kecamatans()->with('kabupaten')->get()->map(fn ($k) => [
                'id' => $k->id,
                'namaKec' => $k->nama_kec,
                'kabupatenId' => $k->kabupaten?->id,
                'namaKab' => $k->kabupaten?->nama_kab,
            ])->values();
        }

        return $payload;
    }
}
