<?php

use App\Http\Controllers\Api\AppUserController;
use App\Http\Controllers\Api\CostRateController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\OrderController;
use App\Http\Controllers\Api\ProductController;
use App\Http\Controllers\Api\ProductStockRequestController;
use App\Http\Controllers\Api\SettingController;
use App\Http\Controllers\Api\ShipmentController;
use App\Http\Controllers\Api\SubsidyQuotaController;
use App\Http\Controllers\Api\TransportBillingController;
use App\Http\Controllers\Api\TransportPartnerRateController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api\WarehouseController;
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
    Route::get('/orders/recap',               [OrderController::class, 'recap']);
    Route::get('/orders/{id}/bptp',           [OrderController::class, 'downloadBptp']);
    Route::get('/orders/{id}/surat-jalan',    [OrderController::class, 'downloadSuratJalan']);
    Route::post('/orders/{id}/cancel',        [OrderController::class, 'cancel']);
    Route::get('/orders/{id}',                [OrderController::class, 'show']);

    // Literal routes sebelum wildcard {id}
    Route::get('/products/categories',        [ProductController::class, 'categories']);
    Route::get('/products',                   [ProductController::class, 'index']);
    Route::post('/products',                  [ProductController::class, 'store']);
    Route::get('/products/{id}',              [ProductController::class, 'show'])->whereNumber('id');
    Route::get('/products/{id}/kecamatan-status', [ProductController::class, 'kecamatanStatus'])->whereNumber('id');
    Route::put('/products/{id}',              [ProductController::class, 'update'])->whereNumber('id');
    Route::delete('/products/{id}',           [ProductController::class, 'destroy'])->whereNumber('id');

    // Ajuan Penambahan Stok (AdminRegion submit → SuperAdmin approve/reject)
    Route::get('/product-stock-requests',                         [ProductStockRequestController::class, 'index']);
    Route::post('/product-stock-requests',                        [ProductStockRequestController::class, 'store']);
    Route::post('/product-stock-requests/{id}/approve',           [ProductStockRequestController::class, 'approve']);
    Route::post('/product-stock-requests/{id}/reject',            [ProductStockRequestController::class, 'reject']);
    Route::get('/product-stock-requests/price/{productId}',       [ProductStockRequestController::class, 'currentPrice']);

    Route::get('/users',                      [UserController::class, 'index']);
    Route::post('/users',                     [UserController::class, 'store']);
    Route::get('/users/{id}',                 [UserController::class, 'show']);
    Route::put('/users/{id}',                 [UserController::class, 'update']);
    Route::delete('/users/{id}',              [UserController::class, 'destroy']);

    Route::get('/notifications',              [NotificationController::class, 'index']);
    Route::patch('/notifications/read-all',   [NotificationController::class, 'markAllRead']);
    Route::patch('/notifications/{id}/read',  [NotificationController::class, 'markRead']);

    // App users (Flutter non-admin users)
    Route::get('/app-users/kiosk',            [AppUserController::class, 'kiosk']);
    Route::post('/app-users/kiosk',           [AppUserController::class, 'storeKiosk']);
    Route::get('/app-users/transportir',      [AppUserController::class, 'transportir']);
    Route::post('/app-users/transportir',     [AppUserController::class, 'storeTransportir']);
    Route::put('/app-users/{id}',             [AppUserController::class, 'update']);
    Route::delete('/app-users/{id}',          [AppUserController::class, 'destroy']);

    // Fee & system settings (SuperAdmin only, controller enforces)
    Route::get('/settings/fees',              [SettingController::class, 'index']);
    Route::put('/settings/fees',              [SettingController::class, 'update']);

    // Fee defaults — reference for AdminRegion when filling allocations
    Route::get('/settings/fees-view',         [SettingController::class, 'view']);

    // Tarif Biaya per Produk x Kecamatan (AdminRegion → submit → SuperAdmin approve)
    Route::get('/cost-rates/kecamatan',     [CostRateController::class, 'kecamatanList']);
    Route::get('/cost-rates/current',       [CostRateController::class, 'currentPrices']);
    Route::get('/cost-rates',               [CostRateController::class, 'index']);
    Route::post('/cost-rates',              [CostRateController::class, 'store']);
    Route::get('/cost-rates/{id}',          [CostRateController::class, 'show']);
    Route::put('/cost-rates/{id}',          [CostRateController::class, 'update']);
    Route::delete('/cost-rates/{id}',       [CostRateController::class, 'destroy']);
    Route::post('/cost-rates/{id}/submit',  [CostRateController::class, 'submit']);
    Route::post('/cost-rates/{id}/review',  [CostRateController::class, 'review']);

    // Tarif Mitra Transportir (AdminRegion, referensi langsung tanpa approval)
    Route::get('/transport-partner-rates',  [TransportPartnerRateController::class, 'index']);
    Route::post('/transport-partner-rates', [TransportPartnerRateController::class, 'store']);

    // Alokasi Quota Subsidi (AdminRegion + SuperAdmin, with approval workflow)
    Route::get('/quota-subsidi/kecamatan',    [SubsidyQuotaController::class, 'kecamatanList']);
    Route::get('/quota-subsidi/current',      [SubsidyQuotaController::class, 'currentStock']);
    Route::get('/quota-subsidi',              [SubsidyQuotaController::class, 'index']);
    Route::post('/quota-subsidi',             [SubsidyQuotaController::class, 'store']);
    Route::get('/quota-subsidi/{id}',         [SubsidyQuotaController::class, 'show']);
    Route::put('/quota-subsidi/{id}',         [SubsidyQuotaController::class, 'update']);
    Route::delete('/quota-subsidi/{id}',      [SubsidyQuotaController::class, 'destroy']);
    Route::post('/quota-subsidi/{id}/submit', [SubsidyQuotaController::class, 'submit']);
    Route::post('/quota-subsidi/{id}/review', [SubsidyQuotaController::class, 'review']);

    // Alokasi Sopir / Shipment tracking (AdminTransport)
    Route::get('/shipments',                  [ShipmentController::class, 'index']);
    Route::post('/shipments',                 [ShipmentController::class, 'store']);
    Route::delete('/shipments/{orderId}',     [ShipmentController::class, 'destroy']);

    // Daftar Gudang (AdminTransport + SuperAdmin)
    Route::get('/warehouses',                 [WarehouseController::class, 'index']);
    Route::post('/warehouses',                [WarehouseController::class, 'store']);
    Route::put('/warehouses/{id}',            [WarehouseController::class, 'update']);
    Route::delete('/warehouses/{id}',         [WarehouseController::class, 'destroy']);

    // Rekap & Tagihan Transport (AdminTransport + SuperAdmin)
    Route::get('/transport-billings',                    [TransportBillingController::class, 'index']);
    Route::get('/transport-billings/preview',            [TransportBillingController::class, 'preview']);
    Route::post('/transport-billings',                   [TransportBillingController::class, 'store']);
    Route::post('/transport-billings/{id}/submit',       [TransportBillingController::class, 'submit']);
    Route::post('/transport-billings/{id}/approve',      [TransportBillingController::class, 'approve']);
    Route::post('/transport-billings/{id}/reject',       [TransportBillingController::class, 'reject']);
});

// ─── SPA shell (catch-all — harus paling bawah) ──────────────────────────────
Route::middleware('auth.admin')->get('/{any?}', function () {
    return view('admin');
})->where('any', '.*');
