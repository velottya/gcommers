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
        $query = $this->accessibleOrders($user)->with('shipment.warehouse');

        if ($request->filled('status')) {
            $query->where('Status', $request->status);
        }

        if ($request->filled('paymentStatus')) {
            $request->paymentStatus === 'paid'
                ? $query->whereNotNull('PaidAt')
                : $query->whereNull('PaidAt');
        }

        if ($request->filled('orderStatus')) {
            $query->where('OrderStatus', $request->orderStatus);
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

        $order = $this->accessibleOrders($user)->with('shipment.warehouse')->where('Id', $id)->firstOrFail();

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

    public function downloadSuratJalan(string $id)
    {
        $user = Auth::user();

        abort_unless(
            in_array($user->Role, ['SuperAdmin', 'AdminRegion'], true),
            403,
            'Akses tidak diizinkan.'
        );

        $order    = $this->accessibleOrders($user)->where('Id', $id)->firstOrFail();
        $shipment = $order->shipment()->with('warehouse')->first();

        abort_if($shipment === null, 404, 'Belum ada alokasi sopir/pengiriman untuk order ini.');

        $pdf = Pdf::loadView('surat-jalan', ['order' => $order, 'shipment' => $shipment])
            ->setPaper('a4', 'portrait');

        $filename = $shipment->ShipmentNumber . '.pdf';

        return $pdf->download($filename);
    }

    public function cancel(Request $request, string $id)
    {
        $user = Auth::user();

        abort_unless(in_array($user->Role, ['SuperAdmin', 'AdminTransport'], true), 403, 'Akses tidak diizinkan.');

        $data = $request->validate([
            'reason' => 'required|string|max:500',
        ]);

        $order = $this->accessibleOrders($user)->where('Id', $id)->firstOrFail();

        abort_unless($order->PaidAt, 422, 'Order belum dibayar, tidak ada yang perlu dibatalkan.');
        abort_if(in_array($order->OrderStatus, ['delivered', 'cancelled'], true), 422, 'Order sudah selesai/dibatalkan.');

        $order->update([
            'OrderStatus'     => 'cancelled',
            'OrderStatusNote' => $data['reason'],
        ]);

        return response()->json($this->format($order->fresh()));
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
        $shipment = $o->relationLoaded('shipment') ? $o->shipment : null;

        $data = [
            'id'              => $o->Id,
            'poNumber'        => $o->PoNumber,
            'userEmail'       => $o->UserEmail,
            'status'          => $o->Status,
            'paymentStatus'   => $o->PaymentStatus,
            'orderStatus'     => $o->EffectiveOrderStatus,
            'orderStatusNote' => $o->OrderStatusNote,
            'vendor'          => $o->Vendor,
            'paymentMethod'   => $o->PaymentMethod,
            'subTotal'        => $o->Subtotal,
            'taxAmount'       => $o->TaxAmount,
            'shippingAmount'  => $o->ShippingAmount,
            'totalAmount'     => $o->TotalAmount,
            'createdAt'       => $o->CreatedAt,
            'updatedAt'       => $o->UpdatedAt,
            'paidAt'          => $o->PaidAt,
            'deliveredAt'     => $o->DeliveredAt,
            'virtualAccount'  => $o->VirtualAccount,
            'vaExpiredAt'     => $o->VaExpiredAt,
            'shipment'        => $shipment ? [
                'shipmentNumber'  => $shipment->ShipmentNumber,
                'status'          => $shipment->Status,
                'driverName'      => $shipment->DriverName,
                'transportirEmail'=> $shipment->TransportirEmail,
                'truckLabel'      => $shipment->TruckLabel,
                'policeNumber'    => $shipment->PoliceNumber,
                'warehouseName'   => $shipment->warehouse?->name,
                'destinationLabel'=> $shipment->DestinationLabel,
                'destinationAddress' => $shipment->DestinationAddress,
                'muatInPhotoUrl'  => $shipment->MuatInPhotoUrl,
                'muatInAt'        => $shipment->MuatInCompletedAt,
                'muatOutPhotoUrl' => $shipment->MuatOutPhotoUrl,
                'muatOutAt'       => $shipment->MuatOutCompletedAt,
                'completedAt'     => $shipment->CompletedAt,
                'totalDistanceMeters' => $shipment->TotalDistanceMeters,
                'note'            => $shipment->Note,
            ] : null,
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
