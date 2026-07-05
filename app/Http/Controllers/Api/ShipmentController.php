<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\GudangSubmission;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\OrderTransportAssignment;
use App\Models\Shipment;
use App\Models\SoSubmissionLineOrder;
use App\Models\User;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

/**
 * Alokasi Sopir (AdminTransport): satu order bisa dipecah ke beberapa truk,
 * masing-masing membawa produk + tonase tertentu (1 baris `Shipments` = 1
 * truk, lihat ProductId/QuotaTon/SlotIndex). AdminTransport hanya bisa
 * mengalokasikan truk untuk produk & tonase yang sudah dijatah AdminRegion ke
 * perusahaannya lewat `order_transport_assignments` (lihat
 * OrderController::saveTransportAssignments) — TIDAK lagi disaring dari
 * `Orders.Vendor`, karena 1 order kini bisa melibatkan lebih dari 1 mitra.
 * AdminTransport langsung menugaskan sopir saat membuat slot. Transisi status
 * selanjutnya (siap_muat -> dalam_perjalanan -> selesai) dilakukan oleh app
 * Transportir saat upload foto load-in/load-out — controller ini TIDAK
 * menyediakan endpoint untuk memaksa transisi tersebut.
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
        $query   = $this->companyOrder($user);

        $orders = $query->orderBy('CreatedAt', 'desc')->paginate(20);

        $orderIds    = $orders->pluck('Id')->all();
        $shipments   = Shipment::whereIn('OrderId', $orderIds)->where('CompanyName', $company)->get()->groupBy('OrderId');
        $assignments = OrderTransportAssignment::whereIn('order_id', $orderIds)->where('company_name', $company)->get()->groupBy('order_id');

        $emails     = $orders->pluck('UserEmail')->unique()->filter()->all();
        $kioskNames = User::whereIn('Email', $emails)->where('Role', 'kiosk')->pluck('KioskName', 'Email')->all();

        $orders->getCollection()->transform(function (Order $o) use ($shipments, $assignments, $kioskNames) {
            $slots = $shipments->get($o->Id, collect());
            $rows  = $assignments->get($o->Id, collect());

            $assignedTon  = (float) $rows->sum('quota_ton');
            $allocatedTon = (float) $slots->sum('QuotaTon');

            return [
                'id'            => $o->Id,
                'poNumber'      => $o->PoNumber,
                'userEmail'     => $o->UserEmail,
                'kioskName'     => $kioskNames[$o->UserEmail] ?? null,
                'paymentStatus' => $o->PaymentStatus,
                'orderStatus'   => $o->EffectiveOrderStatus,
                'createdAt'     => $o->CreatedAt,
                'slotCount'     => $slots->count(),
                'assignedTon'   => $assignedTon,
                'allocatedTon'  => $allocatedTon,
                'allocationStatus' => $slots->isEmpty()
                    ? 'belum_dialokasikan'
                    : (abs($allocatedTon - $assignedTon) < 0.01 ? 'penuh' : 'sebagian'),
            ];
        });

        return response()->json($orders);
    }

    // ── Detail order untuk modal alokasi: produk yang dijatah company ini + slot truk yang sudah ada ──

    public function orderShipments(int $orderId)
    {
        $user = Auth::user();
        $this->ensureAdminTransport($user);

        $company = trim($user->CompanyName ?? '');
        $order   = $this->companyOrder($user)->where('Id', $orderId)->firstOrFail();

        $assignments = OrderTransportAssignment::where('order_id', $order->Id)->where('company_name', $company)->get()->groupBy('product_id');
        $shipments   = Shipment::with('warehouse')->where('OrderId', $order->Id)->where('CompanyName', $company)->orderBy('SlotIndex')->get();
        $kiosk       = OrderController::resolveKiosk($order);

        $allocatedByProduct = $shipments->groupBy('ProductId')->map(fn ($g) => (float) $g->sum('QuotaTon'));

        $items = $assignments->map(function ($group, $productId) use ($allocatedByProduct) {
            $first       = $group->first();
            $assignedTon = (float) $group->sum('quota_ton');
            $allocatedTon = (float) ($allocatedByProduct->get((int) $productId) ?? 0);

            return [
                'product_id'    => (int) $productId,
                'product_code'  => $first->product_code,
                'product_name'  => $first->product_name,
                'purchased_ton' => $assignedTon,
                'allocated_ton' => $allocatedTon,
                'remaining_ton' => max(0, round($assignedTon - $allocatedTon, 2)),
            ];
        })->values();

        // Gudang yang tercantum di SO (approved) untuk order ini
        $gudangList = SoSubmissionLineOrder::where('order_id', $order->Id)
            ->whereHas('line', fn ($q) => $q->where('status', 'approved'))
            ->with('line.gudangs')
            ->get()
            ->flatMap(fn ($lo) => $lo->line->gudangs ?? [])
            ->unique('id')
            ->map(fn ($g) => [
                'nama_gudang' => $g->nama_gudang,
                'alamat'      => trim(collect([$g->alamat_gudang, $g->kelurahan])->filter()->implode(', ')),
                'nama_pic'    => $g->nama_pic,
                'no_telp'     => $g->no_telp,
            ])->values()->all();

        $kioskAddress = trim(collect([$kiosk?->Address, $kiosk?->Kecamatan])->filter()->implode(', ')) ?: null;

        return response()->json([
            'order' => [
                'id'           => $order->Id,
                'poNumber'     => $order->PoNumber,
                'userEmail'    => $order->UserEmail,
                'orderStatus'  => $order->EffectiveOrderStatus,
                'kioskName'    => $kiosk?->KioskName ?: $kiosk?->DisplayName,
                'kioskAddress' => $kioskAddress,
                'gudang'       => $gudangList,
            ],
            'items'     => $items,
            'shipments' => $shipments->map(fn (Shipment $s) => [
                'id'               => $s->Id,
                'productId'        => $s->ProductId,
                'productCode'      => null, // diturunkan di frontend dari daftar items via productId
                'productName'      => $s->ProductName,
                'quotaTon'         => (float) $s->QuotaTon,
                'status'           => $s->Status,
                'locked'           => $s->Status !== Shipment::STATUS_SIAP_MUAT,
                'driverName'       => $s->DriverName,
                'transportirEmail' => $s->TransportirEmail,
                'truckLabel'       => $s->TruckLabel,
                'policeNumber'     => $s->PoliceNumber,
                'note'             => $s->Note,
                'muatInAt'         => $s->MuatInCompletedAt,
                'muatOutAt'        => $s->MuatOutCompletedAt,
            ])->values(),
        ]);
    }

    public function store(Request $request)
    {
        $user    = Auth::user();
        $this->ensureAdminTransport($user);
        $company = trim($user->CompanyName ?? '');

        $data = $request->validate([
            'order_id'          => 'required|integer',
            'product_id'        => 'required|integer',
            'quota_ton'         => 'required|numeric|min:0.01',
            'transportir_email' => 'required|email',
            'note'              => 'nullable|string|max:500',
        ]);

        $order = $this->companyOrder($user)->where('Id', $data['order_id'])->firstOrFail();

        abort_if(
            in_array($order->OrderStatus, ['delivered', 'cancelled'], true),
            422,
            'Order sudah selesai/dibatalkan, tidak bisa dialokasikan sopir.'
        );

        $assignedTon = (float) OrderTransportAssignment::where('order_id', $order->Id)
            ->where('product_id', $data['product_id'])
            ->where('company_name', $company)
            ->sum('quota_ton');
        abort_if($assignedTon <= 0, 422, 'Produk ini belum dijatah AdminRegion ke perusahaan Anda.');

        $this->assertWithinRemaining($order->Id, (int) $data['product_id'], $company, $assignedTon, (float) $data['quota_ton']);

        $driver  = $this->findCompanyDriver($data['transportir_email'], $user);
        $kiosk   = User::where('Email', $order->UserEmail)->where('Role', 'kiosk')->first();
        $product = OrderItem::where('OrderId', $order->Id)->where('ProductId', $data['product_id'])->first();

        $shipment = DB::transaction(function () use ($order, $driver, $kiosk, $product, $data, $user, $company) {
            $slotIndex = (int) Shipment::where('OrderId', $order->Id)->max('SlotIndex') + 1;

            $shipment = Shipment::create([
                'ShipmentNumber'     => $this->nextShipmentNumber(),
                'OrderId'            => $order->Id,
                'ProductId'          => $product->ProductId,
                'ProductName'        => $product->ProductName,
                'QuotaTon'           => $data['quota_ton'],
                'SlotIndex'          => $slotIndex,
                'CompanyName'        => $company,
                'DriverName'         => $driver->TransportirName ?: $driver->DisplayName,
                'TransportirEmail'   => $driver->Email,
                'TruckLabel'         => trim(($driver->Type ?: '') . ($driver->PoliceNumber ? " (Nopol: {$driver->PoliceNumber})" : '')) ?: null,
                'PoliceNumber'       => $driver->PoliceNumber,
                'DestinationLabel'   => $kiosk?->KioskName ?: $kiosk?->DisplayName,
                'DestinationAddress' => trim(collect([$kiosk?->Address, $kiosk?->Kecamatan])->filter()->implode(', ')) ?: null,
                'Note'               => $data['note'] ?? null,
                'AssignedBy'         => $user->Email,
                'Status'             => Shipment::STATUS_SIAP_MUAT,
                'CreatedAt'          => now(),
            ]);

            if (! $order->OrderStatus) {
                $order->update(['OrderStatus' => 'processing']);
            }

            return $shipment;
        });

        return response()->json($shipment, 201);
    }

    public function update(Request $request, int $id)
    {
        $user     = Auth::user();
        $this->ensureAdminTransport($user);
        $company  = trim($user->CompanyName ?? '');

        $shipment = Shipment::findOrFail($id);
        $order    = $this->companyOrder($user)->where('Id', $shipment->OrderId)->firstOrFail();

        abort_unless($shipment->Status === Shipment::STATUS_SIAP_MUAT, 422, 'Truk ini sudah berjalan, alokasi tidak bisa diubah lagi.');

        $data = $request->validate([
            'quota_ton'         => 'required|numeric|min:0.01',
            'transportir_email' => 'required|email',
            'note'              => 'nullable|string|max:500',
        ]);

        $assignedTon = (float) OrderTransportAssignment::where('order_id', $order->Id)
            ->where('product_id', $shipment->ProductId)
            ->where('company_name', $company)
            ->sum('quota_ton');

        $this->assertWithinRemaining($order->Id, $shipment->ProductId, $company, $assignedTon, (float) $data['quota_ton'], excludeShipmentId: $shipment->Id);

        $driver = $this->findCompanyDriver($data['transportir_email'], $user);

        $shipment->update([
            'QuotaTon'         => $data['quota_ton'],
            'DriverName'       => $driver->TransportirName ?: $driver->DisplayName,
            'TransportirEmail' => $driver->Email,
            'TruckLabel'       => trim(($driver->Type ?: '') . ($driver->PoliceNumber ? " (Nopol: {$driver->PoliceNumber})" : '')) ?: null,
            'PoliceNumber'     => $driver->PoliceNumber,
            'Note'             => $data['note'] ?? null,
            'AssignedBy'       => $user->Email,
            'UpdatedAt'        => now(),
        ]);

        return response()->json($shipment->fresh());
    }

    public function downloadSuratJalanPengantar(int $shipmentId)
    {
        $user = Auth::user();
        abort_unless(in_array($user->Role, ['AdminTransport', 'AdminRegion', 'SuperAdmin'], true), 403, 'Akses tidak diizinkan.');

        $shipment = Shipment::with(['order'])->findOrFail($shipmentId);

        abort_if(
            $shipment->Status === Shipment::STATUS_BELUM_DITUGASKAN,
            404,
            'Slot truk ini belum dialokasikan ke truk/sopir.'
        );

        $order  = $shipment->order;
        $kiosk  = OrderController::resolveKiosk($order);
        $soCode = $this->resolveShipmentSoCode($shipment);

        $pdf = Pdf::loadView('surat-jalan-pengantar', [
            'order'    => $order,
            'shipment' => $shipment,
            'kiosk'    => $kiosk,
            'soCode'   => $soCode,
        ])->setPaper('a4', 'landscape');

        $filename = 'SuratJalan-' . $shipment->ShipmentNumber . '.pdf';

        return $pdf->download($filename);
    }

    public function downloadBptp(int $shipmentId)
    {
        $user = Auth::user();
        abort_unless(in_array($user->Role, ['SuperAdmin', 'AdminRegion'], true), 403, 'Akses tidak diizinkan.');

        $shipment = Shipment::with(['order'])->findOrFail($shipmentId);

        abort_if(
            $shipment->Status === Shipment::STATUS_BELUM_DITUGASKAN,
            404,
            'Slot truk ini belum dialokasikan ke truk/sopir.'
        );

        $order  = $shipment->order;
        try { $order->load(['items.product']); } catch (\Throwable) {}

        $kiosk        = OrderController::resolveKiosk($order);
        $soCode       = $this->resolveShipmentSoCode($shipment);
        $matchingItem = $order->relationLoaded('items')
            ? $order->items->firstWhere('ProductId', $shipment->ProductId)
            : null;

        $pdf = Pdf::loadView('bptp-shipment', [
            'order'        => $order,
            'shipment'     => $shipment,
            'kiosk'        => $kiosk,
            'soCode'       => $soCode,
            'matchingItem' => $matchingItem,
        ])->setPaper('a4', 'portrait');

        $slug     = preg_replace('/[^A-Za-z0-9\-]/', '', $shipment->ShipmentNumber ?? $order->PoNumber);
        $filename = 'BPTP-' . $slug . '.pdf';

        return $pdf->download($filename);
    }

    private function resolveShipmentSoCode(Shipment $shipment): ?string
    {
        if (! $shipment->ProductId) {
            return null;
        }

        return SoSubmissionLineOrder::where('order_id', $shipment->OrderId)
            ->where('product_id', $shipment->ProductId)
            ->whereHas('line', fn ($q) => $q->where('status', 'approved'))
            ->with('line')
            ->orderByDesc('id')
            ->first()?->line?->so_code;
    }

    public function destroy(int $id)
    {
        $user     = Auth::user();
        $this->ensureAdminTransport($user);

        $shipment = Shipment::findOrFail($id);
        $this->companyOrder($user)->where('Id', $shipment->OrderId)->firstOrFail();

        abort_unless(
            $shipment->Status === Shipment::STATUS_SIAP_MUAT,
            422,
            'Pengiriman sudah berjalan (sopir sudah muat barang), alokasi tidak bisa dihapus.'
        );

        $shipment->delete();

        return response()->noContent();
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private function companyOrder(User $user)
    {
        $company = trim($user->CompanyName ?? '');

        return Order::whereNotNull('PaidAt')
            ->when($company, fn ($q) => $q->whereHas('transportAssignments', fn ($q2) => $q2->where('company_name', $company)));
    }

    private function findCompanyDriver(string $email, User $user): User
    {
        $company = trim($user->CompanyName ?? '');

        return User::where('Email', $email)
            ->where('Role', 'transportir')
            ->whereNotNull('Type')
            ->when($company, fn ($q) => $q->where('CompanyName', $company))
            ->firstOrFail();
    }

    /**
     * Total QuotaTon yang sudah dialokasikan (semua slot milik company ini,
     * kecuali $excludeShipmentId saat mengedit slot itu sendiri) ditambah ton baru
     * tidak boleh melebihi jatah yang diberikan AdminRegion ke perusahaan ini
     * untuk produk ini (toleransi 0.01).
     */
    private function assertWithinRemaining(int $orderId, int $productId, string $company, float $assignedTon, float $newTon, ?int $excludeShipmentId = null): void
    {
        $allocated = (float) Shipment::where('OrderId', $orderId)
            ->where('ProductId', $productId)
            ->where('CompanyName', $company)
            ->when($excludeShipmentId, fn ($q) => $q->where('Id', '!=', $excludeShipmentId))
            ->sum('QuotaTon');

        $total = $allocated + $newTon;

        abort_if(
            $total - $assignedTon > 0.01,
            422,
            "Total alokasi produk ini melebihi jatah dari AdminRegion — sisa yang boleh dialokasikan: " . max(0, round($assignedTon - $allocated, 2)) . ' ton.'
        );
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
