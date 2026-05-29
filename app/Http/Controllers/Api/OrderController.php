<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class OrderController extends Controller
{
    public function index(Request $request)
    {
        $user  = Auth::user();
        $query = Order::query();

        // Scope berdasarkan role
        if ($user->Role === 'AdminRegion' && $user->Region) {
            $query->where('vendor', $user->Region);
        } elseif ($user->Role === 'AdminTransport' && $user->CompanyName) {
            $query->where('vendor', $user->CompanyName);
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('poNumber', 'like', "%{$search}%")
                  ->orWhere('userEmail', 'like', "%{$search}%");
            });
        }

        $orders = $query->orderBy('createdAt', 'desc')->paginate(20);

        return response()->json($orders);
    }

    public function show($id)
    {
        $user  = Auth::user();
        $order = Order::findOrFail($id);

        if ($user->Role === 'AdminRegion' && $user->Region && $order->vendor !== $user->Region) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        if ($user->Role === 'AdminTransport' && $user->CompanyName && $order->vendor !== $user->CompanyName) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        // Load relasi jika tabel tersedia; jika kolom FK berbeda, items/events akan kosong
        try {
            $order->load(['items', 'events']);
        } catch (\Throwable) {
            // Abaikan jika relasi tidak bisa di-load karena schema berbeda
        }

        return response()->json($order);
    }
}
