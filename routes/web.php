<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('admin', [
        'adminRole' => null,
        'pageContext' => 'landing',
    ]);
});

Route::get('/dashboard', function () {
    return redirect()->route('dashboard.role', ['role' => 'super-admin']);
});

Route::get('/dashboard/{role}', function (string $role) {
    $roleMap = [
        'super-admin' => 'SuperAdmin',
        'admin-region' => 'AdminRegion',
        'admin-transport' => 'AdminTransport',
    ];

    $adminRole = $roleMap[$role] ?? null;

    abort_if($adminRole === null, 404);

    return view('admin', [
        'adminRole' => $adminRole,
        'pageContext' => 'dashboard',
    ]);
})->middleware('admin.role')->whereIn('role', ['super-admin', 'admin-region', 'admin-transport'])->name('dashboard.role');
