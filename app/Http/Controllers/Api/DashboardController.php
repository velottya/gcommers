<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Product;
use App\Models\SystemNotification;
use App\Models\User;
use Illuminate\Support\Facades\Auth;

class DashboardController extends Controller
{
    public function stats()
    {
        $user = Auth::user();

        return response()->json(match ($user->Role) {
            'SuperAdmin'     => $this->superAdminStats(),
            'AdminRegion'    => $this->adminRegionStats($user),
            'AdminTransport' => $this->adminTransportStats($user),
        });
    }

    private function superAdminStats(): array
    {
        return [
            'totalOrders'         => Order::count(),
            'totalProducts'       => Product::count(),
            'totalAdminUsers'     => User::whereIn('Role', User::ADMIN_ROLES)->count(),
            'unreadNotifications' => SystemNotification::where('isRead', false)->count(),
            'recentOrders'        => $this->formatOrders(
                Order::orderBy('CreatedAt', 'desc')->limit(5)->get()
            ),
        ];
    }

    private function adminRegionStats($user): array
    {
        $baseQuery = $this->adminRegionOrders($user);
        $unreadNotifications = SystemNotification::where('isRead', false)
            ->when(
                SystemNotification::where('UserEmail', $user->Email)->exists(),
                fn ($query) => $query->where('UserEmail', $user->Email)
            )
            ->count();

        return [
            'totalOrders'         => (clone $baseQuery)->count(),
            'totalProducts'       => Product::count(),
            'unreadNotifications' => $unreadNotifications,
            'recentOrders'        => $this->formatOrders(
                (clone $baseQuery)->orderBy('CreatedAt', 'desc')->limit(5)->get()
            ),
        ];
    }

    private function adminTransportStats($user): array
    {
        $company = trim($user->CompanyName ?? '');

        $baseQuery = $company ? Order::where('Vendor', $company) : Order::query();
        $unreadNotifications = SystemNotification::where('isRead', false)
            ->when(
                SystemNotification::where('UserEmail', $user->Email)->exists(),
                fn ($query) => $query->where('UserEmail', $user->Email)
            )
            ->count();

        return [
            'assignedOrders'      => $company
                ? Order::where('Vendor', $company)
                    ->whereIn('Status', ['processing', 'shipped', 'on_delivery'])->count()
                : 0,
            'deliveredOrders'     => $company
                ? Order::where('Vendor', $company)->where('Status', 'delivered')->count()
                : 0,
            'unreadNotifications' => $unreadNotifications,
            'recentOrders'        => $this->formatOrders(
                (clone $baseQuery)->orderBy('CreatedAt', 'desc')->limit(5)->get()
            ),
        ];
    }

    private function formatOrders($orders): array
    {
        return $orders->map(fn (Order $o) => [
            'id'            => $o->Id,
            'poNumber'      => $o->PoNumber,
            'userEmail'     => $o->UserEmail,
            'status'        => $o->Status,
            'vendor'        => $o->Vendor,
            'totalAmount'   => $o->TotalAmount,
            'createdAt'     => $o->CreatedAt,
        ])->all();
    }

    private function adminRegionOrders($user)
    {
        $region = trim($user->Region ?? '');

        if (! $region) {
            return Order::query();
        }

        $scopedQuery = Order::where('Vendor', $region);

        if ($scopedQuery->exists()) {
            return $scopedQuery;
        }

        return Order::query();
    }
}
