<?php

use App\Http\Controllers\Api\AppUserController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\OrderController;
use App\Http\Controllers\Api\ProductController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Auth\LoginController;
use Illuminate\Support\Facades\Route;

// ─── Auth ────────────────────────────────────────────────────────────────────
Route::get('/login', [LoginController::class, 'show'])->name('login');
Route::post('/login', [LoginController::class, 'login'])->name('login.post');
Route::post('/logout', [LoginController::class, 'logout'])->name('logout')->middleware('auth.admin');

// ─── Admin API (session-based, di web.php agar CSRF & session tersedia) ──────
Route::middleware('auth.admin')->prefix('api/admin')->group(function () {
    Route::get('/me',                         [UserController::class, 'me']);
    Route::get('/dashboard/stats',            [DashboardController::class, 'stats']);

    Route::get('/orders',                     [OrderController::class, 'index']);
    Route::get('/orders/{id}',                [OrderController::class, 'show']);

    Route::get('/products',                   [ProductController::class, 'index']);
    Route::get('/products/categories',        [ProductController::class, 'categories']);

    Route::get('/users',                      [UserController::class, 'index']);
    Route::post('/users',                     [UserController::class, 'store']);
    Route::get('/users/{id}',                 [UserController::class, 'show']);
    Route::put('/users/{id}',                 [UserController::class, 'update']);
    Route::delete('/users/{id}',              [UserController::class, 'destroy']);

    Route::get('/notifications',              [NotificationController::class, 'index']);
    Route::patch('/notifications/read-all',   [NotificationController::class, 'markAllRead']);
    Route::patch('/notifications/{id}/read',  [NotificationController::class, 'markRead']);

    // App users (Flutter non-admin users) — SuperAdmin only
    Route::get('/app-users/kiosk',            [AppUserController::class, 'kiosk']);
    Route::post('/app-users/kiosk',           [AppUserController::class, 'storeKiosk']);
    Route::get('/app-users/transportir',      [AppUserController::class, 'transportir']);
    Route::post('/app-users/transportir',     [AppUserController::class, 'storeTransportir']);
    Route::put('/app-users/{id}',             [AppUserController::class, 'update']);
    Route::delete('/app-users/{id}',          [AppUserController::class, 'destroy']);
});

// ─── SPA shell (catch-all — harus paling bawah) ──────────────────────────────
Route::middleware('auth.admin')->get('/{any?}', function () {
    return view('admin');
})->where('any', '.*');
