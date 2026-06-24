<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\GudangSubmission;
use App\Models\Order;
use App\Models\User;
use App\Support\Geo;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class OrderController extends Controller
{
    public function index(Request $request)
    {
        $user  = Auth::user();
        $query = $this->accessibleOrders($user)->with(['shipment.warehouse', 'gudangSubmission.kecamatans.kabupaten']);

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

        $order = $this->accessibleOrders($user)
            ->with(['shipment.warehouse', 'gudangSubmission.kecamatans.kabupaten'])
            ->where('Id', $id)->firstOrFail();

        try {
            $order->load(['items', 'events']);
        } catch (\Throwable) {
            // Abaikan jika relasi belum bisa di-load
        }

        return response()->json($this->format($order, withRelations: true));
    }

    // ── Pilih gudang asal untuk order (AdminRegion) ──────────────────────────

    public function gudangOptions(string $id)
    {
        $user = Auth::user();
        abort_unless($user->Role === 'AdminRegion', 403, 'Akses tidak diizinkan.');

        $order = $this->accessibleOrders($user)->where('Id', $id)->firstOrFail();
        $kiosk = $this->resolveKiosk($order);

        abort_unless($kiosk && $kiosk->Region === $user->Region, 403, 'Order ini bukan milik region Anda.');

        $gudangs = GudangSubmission::where('status', 'approved')
            ->whereHas('region', fn ($q) => $q->where('nama_reg', $user->Region))
            ->with(['kecamatans.kabupaten'])
            ->get()
            ->map(function (GudangSubmission $g) use ($kiosk) {
                $distance = $this->distanceToKiosk($g, $kiosk);
                $tercakup = $kiosk?->KecamatanId !== null && $g->kecamatans->contains('id', $kiosk->KecamatanId);

                return [
                    'id'             => $g->id,
                    'namaGudang'     => $g->nama_gudang,
                    'alamatGudang'   => $g->alamat_gudang,
                    'wilayahCakupan' => $g->kecamatans->map(fn ($k) => [
                        'kecamatan' => $k->nama_kec,
                        'kabupaten' => $k->kabupaten?->nama_kab,
                    ])->values(),
                    'tercakup'       => $tercakup,
                    'distanceMeters' => $distance,
                ];
            })
            // Gudang yang cakupannya meliputi kecamatan kios diutamakan, baru lalu jarak terdekat.
            ->sort(function ($a, $b) {
                if ($a['tercakup'] !== $b['tercakup']) {
                    return $a['tercakup'] ? -1 : 1;
                }

                return ($a['distanceMeters'] ?? PHP_FLOAT_MAX) <=> ($b['distanceMeters'] ?? PHP_FLOAT_MAX);
            })
            ->values();

        return response()->json($gudangs);
    }

    public function assignGudang(Request $request, string $id)
    {
        $user = Auth::user();
        abort_unless($user->Role === 'AdminRegion', 403, 'Akses tidak diizinkan.');

        $data = $request->validate([
            'gudang_submission_id' => 'required|integer',
        ]);

        $order = $this->accessibleOrders($user)->where('Id', $id)->firstOrFail();
        $kiosk = $this->resolveKiosk($order);

        abort_unless($kiosk && $kiosk->Region === $user->Region, 403, 'Order ini bukan milik region Anda.');

        $gudang = GudangSubmission::where('status', 'approved')
            ->whereHas('region', fn ($q) => $q->where('nama_reg', $user->Region))
            ->findOrFail($data['gudang_submission_id']);

        $order->forceFill(['GudangSubmissionId' => $gudang->id])->save();

        $order->load(['shipment.warehouse', 'gudangSubmission.kecamatans.kabupaten']);

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
        $gudang   = $o->relationLoaded('gudangSubmission') ? $o->gudangSubmission : null;
        $kiosk    = $withRelations ? $this->resolveKiosk($o) : null;

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
                'warehouseName'   => $shipment->warehouse?->nama_gudang,
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
            'gudang' => $gudang ? [
                'id'             => $gudang->id,
                'namaGudang'     => $gudang->nama_gudang,
                'alamatGudang'   => $gudang->alamat_gudang,
                'wilayahCakupan' => $gudang->kecamatans->map(fn ($k) => $k->nama_kec . ' (' . ($k->kabupaten?->nama_kab ?? '-') . ')')->implode(', '),
                'distanceMeters' => $this->distanceToKiosk($gudang, $kiosk),
            ] : null,
        ];

        if ($withRelations) {
            $data['items']  = $o->relationLoaded('items')  ? $o->items  : [];
            $data['events'] = $o->relationLoaded('events') ? $o->events : [];
            $data['kiosk']  = $kiosk ? [
                'displayName'   => $kiosk->DisplayName,
                'kioskName'     => $kiosk->KioskName,
                'phone'         => $kiosk->Phone,
                'region'        => $kiosk->Region,
                'propinsi'      => $kiosk->propinsi?->nama_pro,
                'kabupaten'     => $kiosk->kabupaten?->nama_kab,
                'kecamatan'     => $kiosk->kecamatan?->nama_kec,
                'kelurahan'     => $kiosk->Kelurahan,
                'kodePos'       => $kiosk->KodePos,
                'alamatLengkap' => $kiosk->Address,
                'latitude'      => $kiosk->Latitude,
                'longitude'     => $kiosk->Longitude,
            ] : null;
        }

        return $data;
    }

    private function resolveKiosk(Order $o): ?User
    {
        if (! $o->UserEmail) {
            return null;
        }

        return User::where('Email', $o->UserEmail)->where('Role', 'kiosk')
            ->with(['propinsi', 'kabupaten', 'kecamatan'])->first();
    }

    private function distanceToKiosk(GudangSubmission $gudang, ?User $kiosk): ?float
    {
        if (! $kiosk || $gudang->latitude === null || $gudang->longitude === null
            || $kiosk->Latitude === null || $kiosk->Longitude === null) {
            return null;
        }

        return round(Geo::haversineMeters(
            (float) $gudang->latitude, (float) $gudang->longitude,
            (float) $kiosk->Latitude, (float) $kiosk->Longitude
        ), 1);
    }

    private function accessibleOrders(\App\Models\User $user)
    {
        // AdminRegion hanya boleh melihat order dari kios yang region-nya sama —
        // "Vendor" pada Order menyimpan nama perusahaan, bukan region, jadi region
        // ditentukan lewat kios pemesan (UserEmail -> Users.Region).
        if ($user->Role === 'AdminRegion' && $user->Region) {
            return Order::whereIn('UserEmail', function ($q) use ($user) {
                $q->select('Email')->from('Users')->where('Role', 'kiosk')->where('Region', $user->Region);
            });
        }

        if ($user->Role === 'AdminTransport' && $user->CompanyName) {
            return Order::where('Vendor', trim($user->CompanyName));
        }

        return Order::query();
    }
}
