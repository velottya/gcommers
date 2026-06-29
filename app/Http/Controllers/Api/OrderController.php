<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\OrderTransportAssignment;
use App\Models\Shipment;
use App\Models\SoSubmissionLineOrder;
use App\Models\TransportPartnerRate;
use App\Models\User;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class OrderController extends Controller
{
    public function index(Request $request)
    {
        $user  = Auth::user();
        $query = $this->accessibleOrders($user)->with(['shipments']);

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
            $orders->through(fn (Order $o) => $this->format($o, user: $user))
        );
    }

    public function show(string $id)
    {
        $user  = Auth::user();

        $order = $this->accessibleOrders($user)
            ->with(['shipments'])
            ->where('Id', $id)->firstOrFail();

        try {
            $order->load(['items.product', 'events']);
        } catch (\Throwable) {
            // Abaikan jika relasi belum bisa di-load
        }

        return response()->json($this->format($order, withRelations: true, user: $user));
    }

    // ── Alokasi mitra transportir per produk (AdminRegion) ───────────────────
    //
    // 1 pesanan bisa dipecah ke beberapa mitra transportir, masing-masing membawa
    // sebagian/seluruh tonase 1 produk. Ini menulis `order_transport_assignments`,
    // BUKAN `Orders.Vendor` lagi (lihat ORDER_FLOW_CONTRACT.md §3.1 — kolom Vendor
    // dibiarkan ada tapi tidak lagi disentuh admin console). `ShipmentController`
    // (antrian "Alokasi Sopir" AdminTransport) menyaring lewat tabel ini.

    public function transportAssignments(string $id)
    {
        $user = Auth::user();
        abort_unless($user->Role === 'AdminRegion', 403, 'Akses tidak diizinkan.');

        $order = $this->accessibleOrders($user)->with('items')->where('Id', $id)->firstOrFail();
        $kiosk = $this->resolveKiosk($order);

        abort_unless($kiosk && $kiosk->Region === $user->Region, 403, 'Order ini bukan milik region Anda.');

        $assignments = OrderTransportAssignment::where('order_id', $order->Id)->get()->groupBy('product_id');

        $items = $order->items->groupBy('ProductId')->map(function ($group, $productId) use ($assignments) {
            $first        = $group->first();
            $purchasedTon = (float) $group->sum('Quantity');
            $rows         = $assignments->get((int) $productId, collect());
            $allocatedTon = (float) $rows->sum('quota_ton');

            return [
                'product_id'    => (int) $productId,
                'product_code'  => $first->productCode,
                'product_name'  => $first->ProductName,
                'purchased_ton' => $purchasedTon,
                'remaining_ton' => max(0, round($purchasedTon - $allocatedTon, 2)),
                'assignments'   => $rows->map(fn (OrderTransportAssignment $r) => [
                    'id'           => $r->id,
                    'company_name' => $r->company_name,
                    'quota_ton'    => (float) $r->quota_ton,
                ])->values(),
            ];
        })->values();

        return response()->json([
            'items'          => $items,
            'partnerOptions' => $this->coveredTransportPartners($user->Region, $kiosk?->KecamatanId)->values(),
        ]);
    }

    public function saveTransportAssignments(Request $request, string $id)
    {
        $user = Auth::user();
        abort_unless($user->Role === 'AdminRegion', 403, 'Akses tidak diizinkan.');

        $data = $request->validate([
            'assignments'                => 'array',
            'assignments.*.product_id'   => 'required|integer',
            'assignments.*.company_name' => 'required|string|max:200',
            'assignments.*.quota_ton'    => 'required|numeric|min:0.01',
        ]);
        $assignments = $data['assignments'] ?? [];

        $order = $this->accessibleOrders($user)->with('items')->where('Id', $id)->firstOrFail();
        $kiosk = $this->resolveKiosk($order);

        abort_unless($kiosk && $kiosk->Region === $user->Region, 403, 'Order ini bukan milik region Anda.');

        $coveredCompanies = $this->coveredTransportPartners($user->Region, $kiosk?->KecamatanId)->pluck('company_name');
        $purchasedByProduct = $order->items->groupBy('ProductId')->map(fn ($g) => (float) $g->sum('Quantity'));

        // Tidak boleh mengurangi jatah (product+company) di bawah tonase yang sudah
        // dipakai AdminTransport (truk yang sudah dibuat untuk company itu).
        $alreadyShipped = Shipment::where('OrderId', $order->Id)
            ->whereNotNull('CompanyName')
            ->get()
            ->groupBy(fn (Shipment $s) => $s->ProductId . '|' . $s->CompanyName)
            ->map(fn ($g) => (float) $g->sum('QuotaTon'));

        $sumByProduct        = [];
        $sumByProductCompany = [];
        foreach ($assignments as $a) {
            abort_unless($coveredCompanies->contains($a['company_name']), 422, "Mitra transportir \"{$a['company_name']}\" tidak tersedia atau tidak mencakup wilayah kios tujuan.");

            $sumByProduct[$a['product_id']] = ($sumByProduct[$a['product_id']] ?? 0) + $a['quota_ton'];

            $key = $a['product_id'] . '|' . $a['company_name'];
            $sumByProductCompany[$key] = ($sumByProductCompany[$key] ?? 0) + $a['quota_ton'];
        }

        foreach ($sumByProduct as $productId => $total) {
            $purchased = (float) ($purchasedByProduct->get($productId) ?? 0);
            abort_if($purchased <= 0, 422, "Produk #{$productId} bukan bagian dari order ini.");
            abort_if($total - $purchased > 0.01, 422, "Total alokasi produk #{$productId} melebihi jumlah pembelian.");
        }

        foreach ($alreadyShipped as $key => $shippedTon) {
            $newTon = $sumByProductCompany[$key] ?? 0;
            abort_if($newTon + 0.01 < $shippedTon, 422, 'Tidak bisa mengurangi jatah di bawah tonase yang sudah dialokasikan AdminTransport ke truk.');
        }

        $productMeta = $order->items->groupBy('ProductId')->map(fn ($g) => $g->first());

        DB::transaction(function () use ($order, $assignments, $productMeta, $user) {
            OrderTransportAssignment::where('order_id', $order->Id)->delete();

            foreach ($assignments as $a) {
                $meta = $productMeta->get($a['product_id']);

                OrderTransportAssignment::create([
                    'order_id'     => $order->Id,
                    'product_id'   => $a['product_id'],
                    'product_code' => $meta?->productCode,
                    'product_name' => $meta?->ProductName,
                    'company_name' => $a['company_name'],
                    'quota_ton'    => $a['quota_ton'],
                    'assigned_by'  => $user->Email,
                ]);
            }

            if (! $order->OrderStatus && ! empty($assignments)) {
                $order->update(['OrderStatus' => 'processing']);
            }
        });

        return response()->json($this->format($order->fresh(), withRelations: true, user: $user));
    }

    private function coveredTransportPartners(string $region, ?int $kiosKecamatanId)
    {
        if ($kiosKecamatanId === null) {
            return collect();
        }

        // Kolom Users.Role di DB menyimpan nilai mentah (admin/transportir/superadmin),
        // bukan nama tampilan ('AdminTransport') — User::$ADMIN_ROLE_STORAGE_MAP
        // memetakan AdminTransport -> 'transportir'. Akun level perusahaan (bukan
        // sopir/truk perorangan) dibedakan lewat Type yang NULL (lihat pola yang
        // sama di UserController::index() dan AppUserController::transportir()).
        $coveredCompanies = User::where('Role', User::ADMIN_ROLE_STORAGE_MAP['AdminTransport'])
            ->whereNull('Type')
            ->where('Region', $region)
            ->whereHas('kecamatans', fn ($q) => $q->where('kecamatan.id', $kiosKecamatanId))
            ->pluck('CompanyName')
            ->filter()
            ->unique();

        return TransportPartnerRate::where('region', $region)
            ->whereIn('company_name', $coveredCompanies)
            ->whereNotNull('shipping_cost_per_kg')
            ->orderBy('company_name')
            ->get()
            ->map(fn (TransportPartnerRate $r) => [
                'company_name'         => $r->company_name,
                'shipping_cost_per_kg'  => (float) $r->shipping_cost_per_kg,
            ]);
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
            $order->load(['items.product', 'events']);
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
        $shipment = $order->shipments()->first();

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

        return response()->json($this->format($order->fresh(), user: $user));
    }

    public function recap(Request $request)
    {
        abort_unless(Auth::user()?->Role === 'SuperAdmin', 403, 'Akses tidak diizinkan.');

        $period = $request->input('period'); // "2026-06" optional

        $itemsQuery = Order::query()->whereNotNull('PaidAt')->with(['items', 'transportAssignments']);

        if ($period && preg_match('/^\d{4}-\d{2}$/', $period)) {
            [$year, $month] = explode('-', $period);
            $itemsQuery->whereYear('CreatedAt', (int) $year)->whereMonth('CreatedAt', (int) $month);
        }

        $orders = $itemsQuery->get();

        // Rekap sekarang dikelompokkan per mitra transportir (company_name di
        // order_transport_assignments), bukan lagi Orders.Vendor — 1 pesanan boleh
        // melibatkan >1 mitra, jadi total_orders/revenue di sini dihitung per
        // distinct order yang melibatkan mitra itu (order dgn >1 mitra akan
        // terhitung di tiap mitra terkait). `shipping` tetap presisi karena
        // dihitung dari tonase assignment milik masing-masing mitra saja.
        $byVendor = [];
        foreach ($orders as $order) {
            $companies = $order->transportAssignments->pluck('company_name')->unique();

            foreach ($companies as $company) {
                if (! isset($byVendor[$company])) {
                    $byVendor[$company] = [
                        'vendor'       => $company,
                        'total_orders' => 0,
                        'revenue'      => 0,
                        'shipping'     => self::totalShippingCost(collect([$order]), $company),
                        'by_status'    => [],
                    ];
                } else {
                    $byVendor[$company]['shipping'] += self::totalShippingCost(collect([$order]), $company);
                }

                $byVendor[$company]['total_orders']++;
                $byVendor[$company]['revenue'] += (float) $order->TotalAmount;
                $byVendor[$company]['by_status'][$order->Status] = ($byVendor[$company]['by_status'][$order->Status] ?? 0) + 1;
            }
        }

        return response()->json(array_values($byVendor));
    }

    /**
     * Ongkos kirim dihitung dari tarif mitra transportir (TransportPartnerRate,
     * Rp/kg per region+company) × tonase yang dijatah ke mitra tsb di
     * order_transport_assignments — bukan dari seluruh qty order, karena 1 order
     * bisa dipecah ke beberapa mitra. Kalau $company diisi, hanya hitung porsi
     * mitra itu; kalau null, hitung semua assignment di order-order ini gabungan
     * (dipakai TransportBillingController & recap() di sini).
     */
    public static function totalShippingCost(\Illuminate\Support\Collection $orders, ?string $company = null): float
    {
        $total     = 0.0;
        $rateCache = [];

        foreach ($orders as $order) {
            $kiosk = self::resolveKiosk($order);
            if (! $kiosk?->Region) {
                continue;
            }

            $assignments = $order->relationLoaded('transportAssignments')
                ? $order->transportAssignments
                : $order->transportAssignments()->get();

            foreach ($assignments as $assignment) {
                if ($company !== null && $assignment->company_name !== $company) {
                    continue;
                }

                $cacheKey = $kiosk->Region . '|' . $assignment->company_name;
                if (! array_key_exists($cacheKey, $rateCache)) {
                    $rateCache[$cacheKey] = TransportPartnerRate::where('region', $kiosk->Region)
                        ->where('company_name', $assignment->company_name)
                        ->value('shipping_cost_per_kg');
                }

                $rate = $rateCache[$cacheKey];
                if ($rate === null) {
                    continue;
                }

                $total += ((float) $assignment->quota_ton) * 1000 * (float) $rate;
            }
        }

        return $total;
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────

    private function format(Order $o, bool $withRelations = false, ?User $user = null): array
    {
        $shipments      = $o->relationLoaded('shipments') ? $o->shipments : collect();
        $hideFinancials = $user?->Role === 'AdminTransport';

        // Kalau (order_id, product_id) ini pernah masuk >1 pengajuan SO (mis. yang
        // pertama ditolak, lalu direkap ulang), urutkan by id supaya baris yang
        // paling baru (keyBy "last wins") yang ditampilkan.
        $soLineOrders = SoSubmissionLineOrder::where('order_id', $o->Id)
            ->with('line.gudangs')
            ->orderBy('id')
            ->get()
            ->keyBy('product_id');

        $soStatuses = $soLineOrders->map(fn (SoSubmissionLineOrder $lo) => $lo->line->status);
        $soStatus   = $soStatuses->isEmpty()
            ? 'none'
            : ($soStatuses->every(fn ($s) => $s === 'approved')
                ? 'approved'
                : ($soStatuses->contains('rejected') && $soStatuses->unique()->count() === 1 ? 'rejected' : 'submitted'));

        $data = [
            'id'              => $o->Id,
            'poNumber'        => $o->PoNumber,
            'resiNomor'       => $o->ResiNomor,
            'shippingType'    => $o->ShippingType,
            'userEmail'       => $o->UserEmail,
            'status'          => $o->Status,
            'orderStatus'     => $o->EffectiveOrderStatus,
            'orderStatusNote' => $o->OrderStatusNote,
            'vendor'          => $o->Vendor,
            'soStatus'        => $soStatus,
            'createdAt'       => $o->CreatedAt,
            'updatedAt'       => $o->UpdatedAt,
            'paidAt'          => $o->PaidAt,
            'deliveredAt'     => $o->DeliveredAt,
            'shipments'       => $shipments->map(fn (Shipment $s) => [
                'id'              => $s->Id,
                'slotIndex'       => $s->SlotIndex,
                'productCode'     => $s->ProductCode,
                'productName'     => $s->ProductName,
                'quotaTon'        => $s->QuotaTon,
                'shipmentNumber'  => $s->ShipmentNumber,
                'status'          => $s->Status,
                'driverName'      => $s->DriverName,
                'transportirEmail'=> $s->TransportirEmail,
                'companyName'     => $s->CompanyName,
                'truckLabel'      => $s->TruckLabel,
                'policeNumber'    => $s->PoliceNumber,
                'destinationLabel'=> $s->DestinationLabel,
                'destinationAddress' => $s->DestinationAddress,
                'muatInPhotoUrl'  => $s->MuatInPhotoUrl,
                'muatInAt'        => $s->MuatInCompletedAt,
                'muatOutPhotoUrl' => $s->MuatOutPhotoUrl,
                'muatOutAt'       => $s->MuatOutCompletedAt,
                'completedAt'     => $s->CompletedAt,
                'totalDistanceMeters' => $s->TotalDistanceMeters,
                'note'            => $s->Note,
            ])->values(),
        ];

        if (! $hideFinancials) {
            $data['paymentStatus']  = $o->PaymentStatus;
            $data['paymentMethod']  = $o->PaymentMethod;
            $data['subTotal']       = $o->Subtotal;
            $data['taxAmount']      = $o->TaxAmount;
            $data['totalAmount']    = $o->TotalAmount;
            $data['virtualAccount'] = $o->VirtualAccount;
            $data['vaExpiredAt']    = $o->VaExpiredAt;
        }

        if ($withRelations) {
            $assignmentsByProduct = OrderTransportAssignment::where('order_id', $o->Id)->get()->groupBy('product_id');

            $data['items']  = $o->relationLoaded('items') ? $o->items->map(function (OrderItem $item) use ($assignmentsByProduct, $soLineOrders) {
                $soLine = $soLineOrders->get($item->ProductId)?->line;

                return [
                    'id'                  => $item->Id,
                    'productCode'         => $item->ProductCode,
                    'productName'         => $item->ProductName,
                    'quantity'            => $item->Quantity,
                    'unit'                => $item->Unit,
                    'unitPrice'           => $item->UnitPrice,
                    'totalPrice'          => $item->TotalPrice,
                    'transportAssignments'=> $assignmentsByProduct->get($item->ProductId, collect())
                        ->map(fn (OrderTransportAssignment $a) => [
                            'company_name' => $a->company_name,
                            'quota_ton'    => (float) $a->quota_ton,
                        ])->values(),
                    'soStatus'            => $soLine?->status,
                    'soCode'              => $soLine?->status === 'approved' ? $soLine->so_code : null,
                    'soGudang'            => $soLine?->status === 'approved' ? $soLine->gudangs->pluck('nama_gudang')->values() : [],
                ];
            })->values() : [];
            $data['events'] = $o->relationLoaded('events') ? $o->events : [];
            $data['kiosk']  = ($kiosk = $this->resolveKiosk($o)) ? [
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

    public static function resolveKiosk(Order $o): ?User
    {
        if (! $o->UserEmail) {
            return null;
        }

        return User::where('Email', $o->UserEmail)->where('Role', 'kiosk')
            ->with(['propinsi', 'kabupaten', 'kecamatan'])->first();
    }

    private function accessibleOrders(\App\Models\User $user)
    {
        // AdminRegion & AdminTransport hanya boleh melihat order dari kios yang
        // region-nya sama dengan region akun mereka — "Vendor" pada Order menyimpan
        // nama perusahaan, bukan region, jadi region ditentukan lewat kios pemesan
        // (UserEmail -> Users.Region). (Alokasi Sopir/ShipmentController tetap pakai
        // filter sendiri lewat order_transport_assignments, tidak terpengaruh perubahan ini.)
        if (in_array($user->Role, ['AdminRegion', 'AdminTransport'], true) && $user->Region) {
            return Order::whereIn('UserEmail', function ($q) use ($user) {
                $q->select('Email')->from('Users')->where('Role', 'kiosk')->where('Region', $user->Region);
            });
        }

        return Order::query();
    }
}
