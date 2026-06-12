<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class SettingController extends Controller
{
    public function index()
    {
        $this->ensureSuperAdmin();

        return response()->json(array_values(Setting::allAsMap()));
    }

    public function view()
    {
        $user = Auth::user();
        abort_unless(
            in_array($user?->Role, ['SuperAdmin', 'AdminRegion'], true),
            403,
            'Akses tidak diizinkan.'
        );

        return response()->json(array_values(Setting::allAsMap()));
    }

    public function update(Request $request)
    {
        $this->ensureSuperAdmin();

        $data = $request->validate([
            'settings'         => 'required|array',
            'settings.*.key'   => 'required|string|max:100',
            'settings.*.value' => 'required|string|max:500',
        ]);

        foreach ($data['settings'] as $item) {
            Setting::where('key', $item['key'])->update(['value' => $item['value']]);
        }

        return response()->json(array_values(Setting::allAsMap()));
    }

    private function ensureSuperAdmin(): void
    {
        abort_unless(Auth::user()?->Role === 'SuperAdmin', 403, 'Akses tidak diizinkan.');
    }
}
