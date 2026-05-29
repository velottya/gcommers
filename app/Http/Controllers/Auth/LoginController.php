<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\AdminCredential;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;

class LoginController extends Controller
{
    public function show()
    {
        if (Auth::check()) {
            return redirect('/');
        }

        return view('login');
    }

    public function login(Request $request)
    {
        $request->validate([
            'email'    => 'required|email',
            'password' => 'required|string',
        ]);

        $user = User::where('Email', $request->email)
            ->whereIn('Role', User::adminRoleDatabaseValues())
            ->first();

        if (! $user) {
            return back()
                ->withErrors(['email' => 'Akun admin dengan email ini tidak ditemukan.'])
                ->withInput($request->only('email'));
        }

        $credential = AdminCredential::where('user_id', (string) $user->Id)->first();

        if (! $credential) {
            return back()
                ->withErrors(['email' => 'Akun belum dikonfigurasi. Jalankan: php artisan admin:set-password'])
                ->withInput($request->only('email'));
        }

        if (! Hash::check($request->password, $credential->password)) {
            return back()
                ->withErrors(['password' => 'Password salah.'])
                ->withInput($request->only('email'));
        }

        Auth::login($user, $request->boolean('remember'));
        $request->session()->regenerate();

        $credential->update(['last_login_at' => now()]);

        return redirect('/');
    }

    public function logout(Request $request)
    {
        Auth::logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect('/login');
    }
}
