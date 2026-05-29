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
            'totalOrders'          => Order::count(),
            'totalProducts'        => Product::count(),
            'totalAdminUsers'      => User::whereIn('Role', User::adminRoleDatabaseValues())->count(),
            'unreadNotifications'  => SystemNotification::where('isRead', false)->count(),
            'recentOrders'         => Order::orderBy('createdAt', 'desc')->limit(5)->get(),
        ];
    }

    private function adminRegionStats($user): array
    {
        // Filter order berdasarkan vendor = Region admin.
        // Sesuaikan jika mapping region-vendor berbeda di database.
        $regionFilter = $user->Region;

        return [
            'totalOrders'         => $regionFilter
                ? Order::where('vendor', $regionFilter)->count()
                : Order::count(),
            'totalProducts'       => Product::count(),
            'unreadNotifications' => SystemNotification::where('userEmail', $user->Email)->where('isRead', false)->count(),
            'recentOrders'        => ($regionFilter
                ? Order::where('vendor', $regionFilter)
                : Order::query()
            )->orderBy('createdAt', 'desc')->limit(5)->get(),
        ];
    }

    private function adminTransportStats($user): array
    {
        $company = $user->CompanyName;

        return [
            'assignedOrders'      => $company
                ? Order::where('vendor', $company)->whereIn('status', ['processing', 'shipped', 'on_delivery'])->count()
                : 0,
            'deliveredOrders'     => $company
                ? Order::where('vendor', $company)->where('status', 'delivered')->count()
                : 0,
            'unreadNotifications' => SystemNotification::where('userEmail', $user->Email)->where('isRead', false)->count(),
            'recentOrders'        => ($company
                ? Order::where('vendor', $company)
                : Order::query()
            )->orderBy('createdAt', 'desc')->limit(5)->get(),
        ];
    }
}
