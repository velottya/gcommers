<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta name="csrf-token" content="{{ csrf_token() }}">

        <title>Login — {{ config('app.name', 'Gcommers') }} Admin</title>
        <meta name="theme-color" content="#08111f">

        <link rel="preconnect" href="https://fonts.bunny.net">
        <link href="https://fonts.bunny.net/css?family=instrument-sans:400,500,600,700" rel="stylesheet" />

        @vite(['resources/css/app.css'])
    </head>
    <body class="min-h-screen flex items-center justify-center px-4">
        <div class="w-full max-w-sm">
            {{-- Brand --}}
            <div class="mb-8 text-center">
                <p class="text-xs uppercase tracking-[0.32em] text-slate-500">Gcommers</p>
                <h1 class="mt-2 text-2xl font-semibold text-white">Admin Console</h1>
            </div>

            {{-- Card --}}
            <div class="rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.07),rgba(255,255,255,0.03))] p-8 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.8)] backdrop-blur-xl">
                <form method="POST" action="{{ route('login.post') }}" class="space-y-5">
                    @csrf

                    {{-- Global error --}}
                    @if ($errors->has('auth'))
                        <div class="rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-300">
                            {{ $errors->first('auth') }}
                        </div>
                    @endif

                    {{-- Email --}}
                    <div>
                        <label for="email" class="block text-xs uppercase tracking-[0.24em] text-slate-400 mb-2">Email</label>
                        <input
                            type="email"
                            id="email"
                            name="email"
                            value="{{ old('email') }}"
                            autocomplete="email"
                            autofocus
                            class="w-full rounded-xl border {{ $errors->has('email') ? 'border-red-400/40 bg-red-400/5' : 'border-white/10 bg-slate-950/50' }} px-4 py-3 text-sm text-white placeholder-slate-600 outline-none focus:border-amber-400/40 focus:ring-1 focus:ring-amber-400/20 transition"
                            placeholder="admin@gcommers.id"
                        />
                        @error('email')
                            <p class="mt-2 text-xs text-red-400">{{ $message }}</p>
                        @enderror
                    </div>

                    {{-- Password --}}
                    <div>
                        <label for="password" class="block text-xs uppercase tracking-[0.24em] text-slate-400 mb-2">Password</label>
                        <input
                            type="password"
                            id="password"
                            name="password"
                            autocomplete="current-password"
                            class="w-full rounded-xl border {{ $errors->has('password') ? 'border-red-400/40 bg-red-400/5' : 'border-white/10 bg-slate-950/50' }} px-4 py-3 text-sm text-white placeholder-slate-600 outline-none focus:border-amber-400/40 focus:ring-1 focus:ring-amber-400/20 transition"
                            placeholder="••••••••"
                        />
                        @error('password')
                            <p class="mt-2 text-xs text-red-400">{{ $message }}</p>
                        @enderror
                    </div>

                    {{-- Remember --}}
                    <label class="flex items-center gap-3 cursor-pointer">
                        <input type="checkbox" name="remember" class="rounded border-white/20 bg-slate-950/50 text-amber-400 focus:ring-amber-400/30">
                        <span class="text-sm text-slate-400">Ingat saya</span>
                    </label>

                    {{-- Submit --}}
                    <button
                        type="submit"
                        class="w-full rounded-xl bg-amber-400 py-3 text-sm font-semibold text-slate-950 hover:bg-amber-300 active:bg-amber-500 transition focus:outline-none focus:ring-2 focus:ring-amber-400/50"
                    >
                        Masuk
                    </button>
                </form>
            </div>

            <p class="mt-6 text-center text-xs text-slate-600">
                Hanya untuk akun admin yang sudah dikonfigurasi.
            </p>
        </div>
    </body>
</html>
