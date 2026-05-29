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

        if ($user->Role === 'AdminRegion' && $user->Region) {
            $query->where('Vendor', trim($user->Region));
        } elseif ($user->Role === 'AdminTransport' && $user->CompanyName) {
            $query->where('Vendor', trim($user->CompanyName));
        }

        if ($request->filled('status')) {
            $query->where('Status', $request->status);
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('PoNumber', 'like', "%{$search}%")
                  ->orWhere('UserEmail', 'like', "%{$search}%");
            });
        }

        $orders = $query->orderBy('CreatedAt', 'desc')->paginate(20);

        return response()->json(
            $orders->through(fn (Order $o) => $this->format($o))
        );
    }

    public function show(string $id)
    {
        $user  = Auth::user();
        $order = Order::findOrFail($id);

        if ($user->Role === 'AdminRegion' && $user->Region &&
            trim($order->Vendor) !== trim($user->Region)) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        if ($user->Role === 'AdminTransport' && $user->CompanyName &&
            trim($order->Vendor) !== trim($user->CompanyName)) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        try {
            $order->load(['items', 'events']);
        } catch (\Throwable) {
            // Abaikan jika relasi belum bisa di-load
        }

        return response()->json($this->format($order, withRelations: true));
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────

    private function format(Order $o, bool $withRelations = false): array
    {
        $data = [
            'id'             => $o->Id,
            'poNumber'       => $o->PoNumber,
            'userEmail'      => $o->UserEmail,
            'status'         => $o->Status,
            'vendor'         => $o->Vendor,
            'paymentMethod'  => $o->PaymentMethod,
            'subTotal'       => $o->Subtotal,
            'taxAmount'      => $o->TaxAmount,
            'shippingAmount' => $o->ShippingAmount,
            'totalAmount'    => $o->TotalAmount,
            'createdAt'      => $o->CreatedAt,
            'updatedAt'      => $o->UpdatedAt,
            'paidAt'         => $o->PaidAt,
            'deliveredAt'    => $o->DeliveredAt,
            'virtualAccount' => $o->VirtualAccount,
            'vaExpiredAt'    => $o->VaExpiredAt,
        ];

        if ($withRelations) {
            $data['items']  = $o->relationLoaded('items')  ? $o->items  : [];
            $data['events'] = $o->relationLoaded('events') ? $o->events : [];
        }

        return $data;
    }
}
