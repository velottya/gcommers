<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class OrderController extends Controller
{
    public function index(Request $request)
    {
        $user  = Auth::user();
        $query = $this->accessibleOrders($user);

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

        $order = $this->accessibleOrders($user)->where('Id', $id)->firstOrFail();

        try {
            $order->load(['items', 'events']);
        } catch (\Throwable) {
            // Abaikan jika relasi belum bisa di-load
        }

        return response()->json($this->format($order, withRelations: true));
    }

    public function downloadBptp(string $id)
    {
        $user = Auth::user();

        abort_unless(
            in_array($user->Role, ['SuperAdmin', 'AdminRegion'], true),
            403,
            'Akses tidak diizinkan.'
        );

        $order = $this->accessibleOrders($user)->where('Id', $id)->firstOrFail();

        try {
            $order->load(['items', 'events']);
        } catch (\Throwable) {}

        $pdf = Pdf::loadView('bptp', ['order' => $order])
            ->setPaper('a4', 'portrait');

        $filename = 'BPTP-' . preg_replace('/[^A-Za-z0-9\-]/', '', $order->PoNumber) . '.pdf';

        return $pdf->download($filename);
    }

    public function recap(Request $request)
    {
        abort_unless(Auth::user()?->Role === 'SuperAdmin', 403, 'Akses tidak diizinkan.');

        $period = $request->input('period'); // "2026-06" optional

        $query = Order::selectRaw('Vendor, Status, COUNT(*) as total, SUM(TotalAmount) as revenue, SUM(ShippingAmount) as shipping')
            ->groupBy('Vendor', 'Status');

        if ($period && preg_match('/^\d{4}-\d{2}$/', $period)) {
            [$year, $month] = explode('-', $period);
            $query->whereYear('CreatedAt', (int) $year)->whereMonth('CreatedAt', (int) $month);
        }

        $rows = $query->orderBy('Vendor')->get();

        // Pivot per vendor
        $byVendor = [];
        foreach ($rows as $row) {
            $vendor = $row->Vendor ?? '(tanpa vendor)';
            if (! isset($byVendor[$vendor])) {
                $byVendor[$vendor] = [
                    'vendor'       => $vendor,
                    'total_orders' => 0,
                    'revenue'      => 0,
                    'shipping'     => 0,
                    'by_status'    => [],
                ];
            }
            $byVendor[$vendor]['total_orders']          += (int) $row->total;
            $byVendor[$vendor]['revenue']               += (float) $row->revenue;
            $byVendor[$vendor]['shipping']              += (float) $row->shipping;
            $byVendor[$vendor]['by_status'][$row->Status] = (int) $row->total;
        }

        return response()->json(array_values($byVendor));
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

    private function accessibleOrders(\App\Models\User $user)
    {
        if ($user->Role === 'AdminRegion' && $user->Region) {
            $scopedQuery = Order::where('Vendor', trim($user->Region));

            if ($scopedQuery->exists()) {
                return $scopedQuery;
            }

            return Order::query();
        }

        if ($user->Role === 'AdminTransport' && $user->CompanyName) {
            return Order::where('Vendor', trim($user->CompanyName));
        }

        return Order::query();
    }
}
