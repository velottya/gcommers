<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Shipment;
use App\Models\User;
use App\Models\Warehouse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

/**
 * Alokasi Sopir (AdminTransport): membuat/mengubah baris `Shipments` untuk sebuah
 * order yang sudah dibayar. Transisi status selanjutnya (siap_muat -> dalam_perjalanan
 * -> selesai) dilakukan oleh app Transportir saat upload foto load-in/load-out —
 * controller ini TIDAK menyediakan endpoint untuk memaksa transisi tersebut.
 *
 * Lihat docs/ORDER_FLOW_CONTRACT.md.
 */
class ShipmentController extends Controller
{
    public function index(Request $request)
    {
        $user    = Auth::user();
        $this->ensureAdminTransport($user);

        $company = trim($user->CompanyName ?? '');
        $query   = Order::query()->whereNotNull('PaidAt');

        if ($company) {
            $query->where('Vendor', $company);
        }

        $orders = $query->orderBy('CreatedAt', 'desc')->paginate(20);

        $orderIds  = $orders->pluck('Id')->all();
        $shipments = Shipment::with('warehouse')->whereIn('OrderId', $orderIds)->get()->keyBy('OrderId');

        $orders->getCollection()->transform(function (Order $o) use ($shipments) {
            $shipment = $shipments->get($o->Id);

            return [
                'id'              => $o->Id,
                'poNumber'        => $o->PoNumber,
                'userEmail'       => $o->UserEmail,
                'paymentStatus'   => $o->PaymentStatus,
                'orderStatus'     => $o->EffectiveOrderStatus,
                'createdAt'       => $o->CreatedAt,
                'shipmentId'      => $shipment?->Id,
                'shipmentStatus'  => $shipment?->Status,
                'transportirEmail'=> $shipment?->TransportirEmail,
                'driverName'      => $shipment?->DriverName,
                'truckLabel'      => $shipment?->TruckLabel,
                'warehouseName'   => $shipment?->warehouse?->name,
                'note'            => $shipment?->Note,
                'muatInAt'        => $shipment?->MuatInCompletedAt,
                'muatOutAt'       => $shipment?->MuatOutCompletedAt,
            ];
        });

        return response()->json($orders);
    }

    public function store(Request $request)
    {
        $user = Auth::user();
        $this->ensureAdminTransport($user);

        $data = $request->validate([
            'order_id'         => 'required|integer',
            'transportir_email'=> 'required|email',
            'warehouse_id'     => 'required|integer',
            'note'             => 'nullable|string|max:500',
        ]);

        $company = trim($user->CompanyName ?? '');

        $order = Order::whereNotNull('PaidAt')
            ->where('Id', $data['order_id'])
            ->when($company, fn ($q) => $q->where('Vendor', $company))
            ->firstOrFail();

        abort_if(
            in_array($order->OrderStatus, ['delivered', 'cancelled'], true),
            422,
            'Order sudah selesai/dibatalkan, tidak bisa dialokasikan sopir.'
        );

        $driver = User::where('Email', $data['transportir_email'])
            ->where('Role', 'transportir')
            ->whereNotNull('Type')
            ->when($company, fn ($q) => $q->where('CompanyName', $company))
            ->firstOrFail();

        $warehouse = Warehouse::when($company, fn ($q) => $q->where('company_name', $company))
            ->findOrFail($data['warehouse_id']);

        $kiosk = User::where('Email', $order->UserEmail)->where('Role', 'kiosk')->first();

        $shipment = Shipment::where('OrderId', $order->Id)->first();
        $isNew    = $shipment === null;

        if (! $isNew && $shipment->Status !== Shipment::STATUS_SIAP_MUAT) {
            abort(422, 'Pengiriman sudah berjalan, alokasi sopir tidak bisa diubah lagi.');
        }

        DB::transaction(function () use (&$shipment, $isNew, $order, $driver, $warehouse, $kiosk, $data, $user) {
            $attrs = [
                'WarehouseId'        => $warehouse->id,
                'DriverName'         => $driver->TransportirName ?: $driver->DisplayName,
                'TransportirEmail'   => $driver->Email,
                'TruckLabel'         => trim(($driver->Type ?: '') . ($driver->PoliceNumber ? " (Nopol: {$driver->PoliceNumber})" : '')) ?: null,
                'PoliceNumber'       => $driver->PoliceNumber,
                'DestinationLabel'   => $kiosk?->KioskName ?: $kiosk?->DisplayName,
                'DestinationAddress' => trim(collect([$kiosk?->Address, $kiosk?->Kecamatan])->filter()->implode(', ')) ?: null,
                'OriginLat'          => $warehouse->lat,
                'OriginLng'          => $warehouse->lng,
                'Note'               => $data['note'] ?? null,
                'AssignedBy'         => $user->Email,
            ];

            if ($isNew) {
                $attrs['ShipmentNumber'] = $this->nextShipmentNumber();
                $attrs['OrderId']        = $order->Id;
                $attrs['Status']         = Shipment::STATUS_SIAP_MUAT;
                $attrs['CreatedAt']      = now();
                $shipment = Shipment::create($attrs);
            } else {
                $attrs['UpdatedAt'] = now();
                $shipment->update($attrs);
            }

            // Jaga konsistensi tampilan: order yang baru dialokasikan minimal "processing".
            if (! $order->OrderStatus) {
                $order->update(['OrderStatus' => 'processing']);
            }
        });

        return response()->json($shipment->load('warehouse'), $isNew ? 201 : 200);
    }

    public function destroy(int $orderId)
    {
        $user = Auth::user();
        $this->ensureAdminTransport($user);

        $company  = trim($user->CompanyName ?? '');
        $order    = Order::where('Id', $orderId)
            ->when($company, fn ($q) => $q->where('Vendor', $company))
            ->firstOrFail();

        $shipment = Shipment::where('OrderId', $order->Id)->firstOrFail();

        abort_unless(
            $shipment->Status === Shipment::STATUS_SIAP_MUAT,
            422,
            'Pengiriman sudah berjalan (sopir sudah muat barang), alokasi tidak bisa dihapus.'
        );

        $shipment->delete();

        return response()->noContent();
    }

    private function nextShipmentNumber(): string
    {
        $year = now()->year;
        $count = Shipment::where('ShipmentNumber', 'like', "SJ-{$year}-%")->lockForUpdate()->count();

        return sprintf('SJ-%d-%03d', $year, $count + 1);
    }

    private function ensureAdminTransport($user): void
    {
        abort_unless($user->Role === 'AdminTransport', 403, 'Akses tidak diizinkan.');
    }
}
