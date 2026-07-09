<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Shipment;
use App\Models\TransportBilling;
use App\Models\TransportPartnerRate;
use App\Models\User;
use Barryvdh\DomPDF\Facade\Pdf;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class TransportBillingController extends Controller
{
    public function index(Request $request)
    {
        $user  = Auth::user();
        $query = TransportBilling::query();

        if ($user->Role === 'AdminTransport') {
            $query->where('company_name', trim($user->CompanyName ?? ''));
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('period')) {
            $query->where('period', $request->period);
        }

        return response()->json($query->orderBy('period', 'desc')->paginate(20));
    }

    public function summary()
    {
        $user    = Auth::user();
        abort_unless($user->Role === 'AdminTransport', 403, 'Akses tidak diizinkan.');
        $company = trim($user->CompanyName ?? '');

        $allTimeShipping = (float) TransportBilling::where('company_name', $company)
            ->where('status', 'approved')
            ->sum('total_shipping');

        $billedPeriods = TransportBilling::where('company_name', $company)
            ->pluck('period')
            ->toArray();

        $baseQuery = Order::where('Status', 'delivered')->whereNotNull('DeliveredAt');
        if ($company) {
            $baseQuery->whereHas('transportAssignments', fn ($q) => $q->where('company_name', $company));
        }

        $allDelivered   = (clone $baseQuery)->with('transportAssignments')->get();
        $unbilledOrders = $allDelivered->filter(
            fn ($o) => !in_array(Carbon::parse($o->DeliveredAt)->format('Y-m'), $billedPeriods)
        );

        return response()->json([
            'all_time_shipping' => $allTimeShipping,
            'unbilled_shipping' => (float) OrderController::totalShippingCost($unbilledOrders, $company ?: null),
            'unbilled_orders'   => $unbilledOrders->count(),
        ]);
    }

    public function preview(Request $request)
    {
        $user    = Auth::user();
        abort_unless($user->Role === 'AdminTransport', 403, 'Akses tidak diizinkan.');

        $period  = $request->validate(['period' => ['required', 'regex:/^\d{4}-\d{2}$/']])['period'];
        $company = trim($user->CompanyName ?? '');

        [$year, $month] = explode('-', $period);

        $query = Order::where('Status', 'delivered');
        if ($company) {
            $query->whereHas('transportAssignments', fn ($q) => $q->where('company_name', $company));
        }
        $query->whereYear('DeliveredAt', (int) $year)->whereMonth('DeliveredAt', (int) $month);

        $orders = $query->with('transportAssignments')->get();

        return response()->json([
            'company_name'   => $company,
            'period'         => $period,
            'total_orders'   => $orders->count(),
            'total_shipping' => OrderController::totalShippingCost($orders, $company ?: null),
            'total_amount'   => $orders->sum('TotalAmount'),
        ]);
    }

    public function store(Request $request)
    {
        $user    = Auth::user();
        abort_unless($user->Role === 'AdminTransport', 403, 'Akses tidak diizinkan.');

        $period  = $request->validate(['period' => ['required', 'regex:/^\d{4}-\d{2}$/']])['period'];
        $company = trim($user->CompanyName ?? '');

        abort_if(
            TransportBilling::where('company_name', $company)->where('period', $period)->exists(),
            422,
            'Tagihan untuk periode ini sudah ada.'
        );

        $orders  = $this->periodOrders($company, $period);
        $billing = TransportBilling::create([
            'company_name'   => $company,
            'period'         => $period,
            'total_orders'   => $orders->count(),
            'total_shipping' => OrderController::totalShippingCost($orders, $company ?: null),
            'total_amount'   => $orders->sum('TotalAmount'),
            'status'         => 'draft',
            'submitted_by'   => $user->Email,
        ]);

        return response()->json($billing, 201);
    }

    public function submit(int $id)
    {
        $user    = Auth::user();
        abort_unless($user->Role === 'AdminTransport', 403, 'Akses tidak diizinkan.');

        $billing = TransportBilling::where('company_name', trim($user->CompanyName ?? ''))->findOrFail($id);
        abort_unless($billing->status === 'draft', 422, 'Tagihan ini sudah diajukan.');

        $billing->update(['status' => 'submitted']);

        return response()->json($billing->fresh());
    }

    public function recalculate(int $id)
    {
        $user    = Auth::user();
        abort_unless($user->Role === 'AdminTransport', 403, 'Akses tidak diizinkan.');

        $company = trim($user->CompanyName ?? '');
        $billing = TransportBilling::where('company_name', $company)->findOrFail($id);

        abort_unless(
            in_array($billing->status, ['draft', 'submitted', 'rejected'], true),
            422,
            'Tagihan yang sudah disetujui tidak bisa dihitung ulang.'
        );

        $orders = $this->periodOrders($company, $billing->period);

        $billing->update([
            'total_orders'   => $orders->count(),
            'total_shipping' => OrderController::totalShippingCost($orders, $company ?: null),
            'total_amount'   => $orders->sum('TotalAmount'),
            'status'         => 'draft',
            'reviewed_by'    => null,
            'reviewed_at'    => null,
            'note'           => null,
        ]);

        return response()->json($billing->fresh());
    }

    public function approve(Request $request, int $id)
    {
        $user = Auth::user();
        abort_unless($user->Role === 'SuperAdmin', 403, 'Akses tidak diizinkan.');

        $billing = TransportBilling::findOrFail($id);
        abort_unless($billing->status === 'submitted', 422, 'Tagihan belum diajukan.');

        $billing->update([
            'status'      => 'approved',
            'reviewed_by' => $user->Email,
            'reviewed_at' => now(),
            'note'        => $request->input('note'),
        ]);

        return response()->json($billing->fresh());
    }

    public function reject(Request $request, int $id)
    {
        $user = Auth::user();
        abort_unless($user->Role === 'SuperAdmin', 403, 'Akses tidak diizinkan.');

        $billing = TransportBilling::findOrFail($id);
        abort_unless($billing->status === 'submitted', 422, 'Tagihan belum diajukan.');

        $data = $request->validate(['note' => 'nullable|string|max:1000']);

        $billing->update([
            'status'      => 'rejected',
            'reviewed_by' => $user->Email,
            'reviewed_at' => now(),
            'note'        => $data['note'] ?? null,
        ]);

        return response()->json($billing->fresh());
    }

    public function show(int $id)
    {
        $user = Auth::user();
        abort_unless(in_array($user->Role, ['AdminTransport', 'SuperAdmin'], true), 403, 'Akses tidak diizinkan.');

        $billing = TransportBilling::findOrFail($id);
        if ($user->Role === 'AdminTransport') {
            abort_unless($billing->company_name === trim($user->CompanyName ?? ''), 403, 'Akses tidak diizinkan.');
        }

        ['driverRows' => $driverRows, 'orderList' => $orderList, 'periodLabel' => $periodLabel]
            = $this->buildBillingDetail($billing);

        return response()->json([
            'billing'      => $billing,
            'driver_rows'  => $driverRows,
            'order_list'   => $orderList,
            'period_label' => $periodLabel,
        ]);
    }

    public function download(int $id)
    {
        $user = Auth::user();
        abort_unless(in_array($user->Role, ['AdminTransport', 'SuperAdmin'], true), 403, 'Akses tidak diizinkan.');

        $billing = TransportBilling::findOrFail($id);
        if ($user->Role === 'AdminTransport') {
            abort_unless($billing->company_name === trim($user->CompanyName ?? ''), 403, 'Akses tidak diizinkan.');
        }
        abort_unless($billing->status === 'approved', 403, 'Tagihan hanya dapat diunduh setelah disetujui SuperAdmin.');

        ['driverRows' => $driverRows, 'orderList' => $orderList, 'periodLabel' => $periodLabel]
            = $this->buildBillingDetail($billing);

        $pdf = Pdf::loadView('transport-billing', compact('billing', 'orderList', 'driverRows', 'periodLabel'))
            ->setPaper('a4', 'landscape');

        $slug = preg_replace('/[^A-Za-z0-9\-]/', '-', $billing->company_name);
        return $pdf->download("Tagihan-{$slug}-{$billing->period}.pdf");
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private function buildBillingDetail(TransportBilling $billing): array
    {
        $company  = $billing->company_name;
        $orders   = $this->periodOrders($company, $billing->period);
        $orderIds = $orders->pluck('Id')->all();

        $shipments = Shipment::whereIn('OrderId', $orderIds)
            ->where('CompanyName', $company)
            ->orderBy('DriverName')
            ->orderBy('SlotIndex')
            ->get();

        $emails      = $orders->pluck('UserEmail')->unique()->all();
        $kioskUsers  = User::whereIn('Email', $emails)->where('Role', 'kiosk')->get();
        $kioskRegion = $kioskUsers->pluck('Region', 'Email')->all();
        $kioskName   = $kioskUsers->pluck('KioskName', 'Email')->all();

        $regions = array_unique(array_filter(array_values($kioskRegion)));
        $rates   = TransportPartnerRate::where('company_name', $company)
            ->whereIn('region', $regions)
            ->pluck('shipping_cost_per_kg', 'region')
            ->all();

        $orderMap = $orders->keyBy('Id');

        $driverRows = $shipments->groupBy('DriverName')->map(function ($slots, $driverName) use ($orderMap, $kioskRegion, $kioskName, $rates) {
            $rows        = [];
            $driverTotal = 0.0;

            foreach ($slots as $s) {
                $order  = $orderMap->get($s->OrderId);
                $region = $order ? ($kioskRegion[$order->UserEmail] ?? null) : null;
                $rate   = $region ? ($rates[$region] ?? null) : null;
                $cost   = $rate !== null ? (float) $s->QuotaTon * 1000 * (float) $rate : null;
                if ($cost !== null) {
                    $driverTotal += $cost;
                }
                $rows[] = [
                    'po_number'    => $order?->PoNumber,
                    'kiosk_name'   => $order ? ($kioskName[$order->UserEmail] ?? $order->UserEmail) : '—',
                    'product_name' => $s->ProductName,
                    'quota_ton'    => (float) $s->QuotaTon,
                    'rate_per_kg'  => $rate,
                    'cost'         => $cost,
                    'delivered_at' => $order?->DeliveredAt,
                ];
            }

            return [
                'driver_name'   => $driverName,
                'truck_label'   => $slots->first()?->TruckLabel,
                'police_number' => $slots->first()?->PoliceNumber,
                'rows'          => $rows,
                'subtotal'      => $driverTotal,
            ];
        })->values()->all();

        $orderList = $orders->map(fn (Order $o) => [
            'po_number'    => $o->PoNumber,
            'kiosk_name'   => $kioskName[$o->UserEmail] ?? $o->UserEmail,
            'delivered_at' => $o->DeliveredAt,
        ])->all();

        [$year, $month] = explode('-', $billing->period);
        $monthNames  = ['Januari','Februari','Maret','April','Mei','Juni',
                        'Juli','Agustus','September','Oktober','November','Desember'];
        $periodLabel = $monthNames[(int) $month - 1] . ' ' . $year;

        return compact('driverRows', 'orderList', 'periodLabel');
    }

    private function periodOrders(string $company, string $period)
    {
        [$year, $month] = explode('-', $period);

        return Order::where('Status', 'delivered')
            ->when($company, fn ($q) => $q->whereHas('transportAssignments', fn ($q2) => $q2->where('company_name', $company)))
            ->whereYear('DeliveredAt', (int) $year)
            ->whereMonth('DeliveredAt', (int) $month)
            ->with('transportAssignments')
            ->get();
    }
}
