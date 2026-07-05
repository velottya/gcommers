<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CostRateSubmission;
use App\Models\GudangSubmission;
use App\Models\KecamatanProductPrice;
use App\Models\KecamatanProductStock;
use App\Models\Order;
use App\Models\Product;
use App\Models\Shipment;
use App\Models\SoSubmission;
use App\Models\SoSubmissionLineOrder;
use App\Models\SubsidyQuotaSubmission;
use App\Models\SystemNotification;
use App\Models\TransportBilling;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

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
        // ── Entity counts ────────────────────────────────────────────────────────
        $totalOrders   = Order::count();
        $totalProducts = Product::count();
        $totalKiosk    = User::where('Role', 'kiosk')->count();
        $totalGudang   = GudangSubmission::where('status', 'approved')->count();
        $totalSopir    = User::where('Role', 'transportir')->count();
        $totalMitra    = User::where('Role', 'AdminTransport')->count();
        $unread        = SystemNotification::where('isRead', false)->count();

        $ordersThisMonth = Order::whereYear('CreatedAt', now()->year)
            ->whereMonth('CreatedAt', now()->month)->count();

        // ── Order status distribution ────────────────────────────────────────────
        $statusDist = Order::selectRaw('Status, COUNT(*) as cnt')
            ->groupBy('Status')
            ->get()->pluck('cnt', 'Status')
            ->map(fn ($v) => (int) $v)->all();

        // ── Monthly order trend (12 months) ─────────────────────────────────────
        $orderMonthly = Order::where('CreatedAt', '>=', now()->subMonths(11)->startOfMonth())
            ->selectRaw('YEAR(CreatedAt) as yr, MONTH(CreatedAt) as mo, COUNT(*) as cnt, SUM(TotalAmount) as total')
            ->groupBy(DB::raw('YEAR(CreatedAt)'), DB::raw('MONTH(CreatedAt)'))
            ->orderBy(DB::raw('YEAR(CreatedAt)'))->orderBy(DB::raw('MONTH(CreatedAt)'))
            ->get()
            ->map(fn ($r) => [
                'label' => Carbon::createFromDate($r->yr, $r->mo, 1)->locale('id')->isoFormat('MMM YYYY'),
                'count' => (int)   $r->cnt,
                'total' => (float) $r->total,
            ])->values();

        // ── Pending approvals (all types) ────────────────────────────────────────
        $pendingApprovals = [
            'so'      => (int) SoSubmission::where('status', 'submitted')->count(),
            'harga'   => (int) CostRateSubmission::where('status', 'submitted')->count(),
            'quota'   => (int) SubsidyQuotaSubmission::where('status', 'submitted')->count(),
            'gudang'  => (int) GudangSubmission::where('status', 'pending')->count(),
            'billing' => (int) TransportBilling::where('status', 'submitted')->count(),
        ];

        // ── Tagihan transportir ──────────────────────────────────────────────────
        $billingRows = TransportBilling::selectRaw('status, COUNT(*) as cnt, SUM(total_shipping) as total')
            ->groupBy('status')->get()->keyBy('status');

        $billingStats = [
            'draft'     => ['count' => (int) ($billingRows['draft']?->cnt     ?? 0), 'total' => (float) ($billingRows['draft']?->total     ?? 0)],
            'submitted' => ['count' => (int) ($billingRows['submitted']?->cnt ?? 0), 'total' => (float) ($billingRows['submitted']?->total ?? 0)],
            'approved'  => ['count' => (int) ($billingRows['approved']?->cnt  ?? 0), 'total' => (float) ($billingRows['approved']?->total  ?? 0)],
        ];

        $topBillings = TransportBilling::where('status', 'approved')
            ->selectRaw('company_name, SUM(total_shipping) as total, COUNT(*) as periods')
            ->groupBy('company_name')->orderByDesc('total')->limit(8)
            ->get()
            ->map(fn ($r) => [
                'company' => $r->company_name,
                'total'   => (float) $r->total,
                'periods' => (int)   $r->periods,
            ])->values()->all();

        // ── Quota subsidi (stok) per region × produk ─────────────────────────────
        $stockByRegion = KecamatanProductStock::selectRaw(
                'region, product_name, SUM(CAST(quota_ton AS FLOAT)) as total_ton'
            )
            ->groupBy('region', 'product_name')
            ->orderBy('region')->orderBy('product_name')
            ->get()
            ->map(fn ($r) => [
                'region'    => $r->region,
                'product'   => $r->product_name,
                'total_ton' => round((float) $r->total_ton, 2),
            ])->all();

        // ── Harga produk per region × produk ────────────────────────────────────
        $pricesByRegion = KecamatanProductPrice::selectRaw(
                'region, product_name,
                 MIN(harga_satuan) as min_price,
                 MAX(harga_satuan) as max_price,
                 AVG(CAST(harga_satuan AS FLOAT)) as avg_price,
                 COUNT(*) as kec_count'
            )
            ->groupBy('region', 'product_name')
            ->orderBy('region')->orderBy('product_name')
            ->get()
            ->map(fn ($r) => [
                'region'    => $r->region,
                'product'   => $r->product_name,
                'min_price' => (float) $r->min_price,
                'max_price' => (float) $r->max_price,
                'kec_count' => (int)   $r->kec_count,
            ])->all();

        // ── Detail per kecamatan (untuk popup di dashboard) ─────────────────────
        $pricesDetail = KecamatanProductPrice::orderBy('region')->orderBy('kecamatan')->orderBy('product_name')
            ->get()
            ->map(fn ($r) => [
                'region'      => $r->region,
                'kecamatan'   => $r->kecamatan,
                'product'     => $r->product_name,
                'price'       => (float) $r->harga_satuan,
                'approved_at' => $r->approved_at?->toDateString(),
            ])->all();

        $stockDetail = KecamatanProductStock::orderBy('region')->orderBy('kecamatan')->orderBy('product_name')
            ->get()
            ->map(fn ($r) => [
                'region'      => $r->region,
                'kecamatan'   => $r->kecamatan,
                'product'     => $r->product_name,
                'quota_ton'   => (float) $r->quota_ton,
                'period'      => $r->period,
                'approved_at' => $r->approved_at?->toDateString(),
            ])->all();

        return [
            'totalOrders'             => $totalOrders,
            'totalProducts'           => $totalProducts,
            'totalKiosk'              => $totalKiosk,
            'totalGudang'             => $totalGudang,
            'totalSopir'              => $totalSopir,
            'totalMitra'              => $totalMitra,
            'unreadNotifications'     => $unread,
            'ordersThisMonth'         => $ordersThisMonth,
            'orderStatusDistribution' => $statusDist,
            'orderMonthly'            => $orderMonthly,
            'pendingApprovals'        => $pendingApprovals,
            'billingStats'            => $billingStats,
            'topBillings'             => $topBillings,
            'stockByRegion'           => $stockByRegion,
            'pricesByRegion'          => $pricesByRegion,
            'pricesDetail'            => $pricesDetail,
            'stockDetail'             => $stockDetail,
            'recentOrders'            => $this->formatOrders(
                Order::orderBy('CreatedAt', 'desc')->limit(5)->get()
            ),
        ];
    }

    private function adminRegionStats($user): array
    {
        $region    = trim($user->Region ?? '');
        $baseQuery = $this->adminRegionOrders($user);

        $unreadNotifications = SystemNotification::where('isRead', false)
            ->when(
                SystemNotification::where('UserEmail', $user->Email)->exists(),
                fn ($q) => $q->where('UserEmail', $user->Email)
            )
            ->count();

        // ── Stat counts ──────────────────────────────────────────────────────────
        $totalOrders = (clone $baseQuery)->count();
        $totalKiosk  = User::where('Role', 'kiosk')->where('Region', $region)->count();
        $totalGudang = GudangSubmission::where('status', 'approved')
            ->whereHas('region', fn ($q) => $q->where('nama_reg', $region))
            ->count();

        $totalMitraTransportir = Shipment::whereIn('OrderId', (clone $baseQuery)->select('Id'))
            ->whereNotNull('CompanyName')
            ->selectRaw('COUNT(DISTINCT CompanyName) as cnt')
            ->value('cnt') ?? 0;

        $totalSopir = Shipment::whereIn('OrderId', (clone $baseQuery)->select('Id'))
            ->whereNotNull('TransportirEmail')
            ->selectRaw('COUNT(DISTINCT TransportirEmail) as cnt')
            ->value('cnt') ?? 0;

        // ── Sales chart data ─────────────────────────────────────────────────────
        $paidBase = (clone $baseQuery)->whereNotNull('PaidAt');

        $salesWeekly = (clone $paidBase)
            ->where('PaidAt', '>=', now()->subDays(6)->startOfDay())
            ->selectRaw('CAST(PaidAt AS DATE) as d, SUM(TotalAmount) as total, COUNT(*) as cnt')
            ->groupBy(DB::raw('CAST(PaidAt AS DATE)'))
            ->orderBy(DB::raw('CAST(PaidAt AS DATE)'))
            ->get()
            ->map(fn ($r) => [
                'label' => Carbon::parse($r->d)->format('D d/m'),
                'total' => (float) $r->total,
                'count' => (int)   $r->cnt,
            ])->values();

        $salesMonthly = (clone $paidBase)
            ->where('PaidAt', '>=', now()->subMonths(11)->startOfMonth())
            ->selectRaw('YEAR(PaidAt) as yr, MONTH(PaidAt) as mo, SUM(TotalAmount) as total, COUNT(*) as cnt')
            ->groupBy(DB::raw('YEAR(PaidAt)'), DB::raw('MONTH(PaidAt)'))
            ->orderBy(DB::raw('YEAR(PaidAt)'))
            ->orderBy(DB::raw('MONTH(PaidAt)'))
            ->get()
            ->map(fn ($r) => [
                'label' => Carbon::createFromDate($r->yr, $r->mo, 1)->format('M Y'),
                'total' => (float) $r->total,
                'count' => (int)   $r->cnt,
            ])->values();

        $salesAllTime = (clone $paidBase)
            ->selectRaw('YEAR(PaidAt) as yr, SUM(TotalAmount) as total, COUNT(*) as cnt')
            ->groupBy(DB::raw('YEAR(PaidAt)'))
            ->orderBy(DB::raw('YEAR(PaidAt)'))
            ->get()
            ->map(fn ($r) => [
                'label' => (string) $r->yr,
                'total' => (float)  $r->total,
                'count' => (int)    $r->cnt,
            ])->values();

        // Accumulation totals
        $weeklyTotal  = (float) ((clone $paidBase)->where('PaidAt', '>=', now()->subDays(6)->startOfDay())->sum('TotalAmount'));
        $monthlyTotal = (float) ((clone $paidBase)->where('PaidAt', '>=', now()->startOfMonth())->sum('TotalAmount'));
        $allTimeTotal = (float) ((clone $paidBase)->sum('TotalAmount'));

        // ── Order status distribution ────────────────────────────────────────────
        $statusDist = (clone $baseQuery)
            ->selectRaw('Status, COUNT(*) as cnt')
            ->groupBy('Status')
            ->get()
            ->pluck('cnt', 'Status')
            ->map(fn ($v) => (int) $v)
            ->all();

        // ── Top kiosks ───────────────────────────────────────────────────────────
        $topKioskData = (clone $baseQuery)
            ->selectRaw('UserEmail, COUNT(*) as order_count, SUM(TotalAmount) as total_amount')
            ->groupBy('UserEmail')
            ->orderByDesc(DB::raw('SUM(TotalAmount)'))
            ->limit(5)
            ->get();

        $kioskNames = User::whereIn('Email', $topKioskData->pluck('UserEmail')->all())
            ->where('Role', 'kiosk')
            ->pluck('KioskName', 'Email')
            ->all();

        $topKiosks = $topKioskData->map(fn ($r) => [
            'name'        => $kioskNames[$r->UserEmail] ?? $r->UserEmail,
            'orderCount'  => (int)   $r->order_count,
            'totalAmount' => (float) $r->total_amount,
        ])->values()->all();

        // ── Pending submissions awaiting SuperAdmin review ───────────────────────
        $pendingSo        = SoSubmission::where('region', $region)->where('status', 'submitted')->count();
        $pendingHarga     = CostRateSubmission::where('region', $region)->where('status', 'submitted')->count();
        $pendingQuota     = SubsidyQuotaSubmission::where('region', $region)->where('status', 'submitted')->count();

        return [
            'totalOrders'           => $totalOrders,
            'totalProducts'         => Product::count(),
            'totalKiosk'            => $totalKiosk,
            'totalGudang'           => $totalGudang,
            'totalMitraTransportir' => (int) $totalMitraTransportir,
            'totalSopir'            => (int) $totalSopir,
            'unreadNotifications'   => $unreadNotifications,
            'salesWeekly'           => $salesWeekly,
            'salesMonthly'          => $salesMonthly,
            'salesAllTime'          => $salesAllTime,
            'salesTotals'           => [
                'weekly'  => $weeklyTotal,
                'monthly' => $monthlyTotal,
                'allTime' => $allTimeTotal,
            ],
            'orderStatusDistribution' => $statusDist,
            'topKiosks'             => $topKiosks,
            'pendingSubmissions'    => [
                'so'          => (int) $pendingSo,
                'hargaProduk' => (int) $pendingHarga,
                'quotaSubsidi'=> (int) $pendingQuota,
            ],
            'recentOrders'          => $this->formatRegionOrders(
                (clone $baseQuery)->orderBy('CreatedAt', 'desc')->limit(5)->get()
            ),
        ];
    }

    private function formatRegionOrders($orders): array
    {
        if ($orders->isEmpty()) return [];

        $emails     = $orders->pluck('UserEmail')->unique()->filter()->values()->all();
        $kioskNames = User::whereIn('Email', $emails)->where('Role', 'kiosk')
            ->pluck('KioskName', 'Email')->all();

        $orderIds    = $orders->pluck('Id')->all();
        $soLineGroups = SoSubmissionLineOrder::whereIn('order_id', $orderIds)
            ->with('line:id,status')
            ->get()
            ->groupBy('order_id');

        return $orders->map(fn (Order $o) => [
            'id'            => $o->Id,
            'poNumber'      => $o->PoNumber,
            'userEmail'     => $o->UserEmail,
            'kioskName'     => $kioskNames[$o->UserEmail] ?? null,
            'orderStatus'   => $o->OrderStatus,
            'paymentStatus' => $o->PaidAt ? 'paid' : 'pending',
            'soStatus'      => $this->resolveSoStatusForOrder($soLineGroups->get($o->Id, collect())),
            'totalAmount'   => $o->TotalAmount,
            'createdAt'     => $o->CreatedAt,
        ])->all();
    }

    private function resolveSoStatusForOrder($lineOrders): ?string
    {
        $statuses = $lineOrders->map(fn ($lo) => $lo->line?->status)->filter()->unique()->values();
        if ($statuses->isEmpty())              return null;
        if ($statuses->contains('approved'))   return 'approved';
        if ($statuses->contains('submitted'))  return 'submitted';
        if ($statuses->contains('rejected'))   return 'rejected';
        return null;
    }

    private function adminTransportStats($user): array
    {
        $company = trim($user->CompanyName ?? '');
        $region  = trim($user->Region ?? '');

        $shipBase  = Shipment::where('CompanyName', $company);
        $orderIds  = (clone $shipBase)->distinct()->pluck('OrderId')->all();
        $baseOrders = Order::whereIn('Id', $orderIds);

        $unreadNotifications = SystemNotification::where('isRead', false)
            ->when(
                SystemNotification::where('UserEmail', $user->Email)->exists(),
                fn ($q) => $q->where('UserEmail', $user->Email)
            )
            ->count();

        // Sopir aktif (distinct driver yang pernah bertugas di perusahaan ini)
        $activeSopir = (clone $shipBase)->whereNotNull('DriverName')
            ->distinct('DriverName')->count('DriverName');

        // Gudang aktif di region yang sama
        $activeGudang = $region
            ? GudangSubmission::where('status', 'approved')
                ->whereHas('region', fn ($q) => $q->where('nama_reg', $region))
                ->count()
            : 0;

        // Pesanan
        $activeOrders    = (clone $baseOrders)->whereIn('Status', ['processing', 'shipped', 'on_delivery'])->count();
        $deliveredOrders = (clone $baseOrders)->where('Status', 'delivered')->count();

        // Tagihan
        $billingCounts = TransportBilling::where('company_name', $company)
            ->selectRaw('status, COUNT(*) as cnt')
            ->groupBy('status')
            ->get()->pluck('cnt', 'status')->all();

        $totalApprovedShipping = (float) TransportBilling::where('company_name', $company)
            ->where('status', 'approved')->sum('total_shipping');

        // Tonase per produk dari pesanan terkirim
        $deliveredIds  = (clone $baseOrders)->where('Status', 'delivered')->pluck('Id')->all();
        $productTonnage = (clone $shipBase)
            ->whereIn('OrderId', $deliveredIds)
            ->whereNotNull('ProductName')
            ->selectRaw('ProductName, SUM(CAST(QuotaTon AS FLOAT)) as total_ton, COUNT(*) as trip_count')
            ->groupBy('ProductName')
            ->orderByDesc(DB::raw('SUM(CAST(QuotaTon AS FLOAT))'))
            ->get()
            ->map(fn ($r) => [
                'product'    => $r->ProductName,
                'total_ton'  => round((float) $r->total_ton, 2),
                'trip_count' => (int) $r->trip_count,
            ])->all();

        // Tren pengiriman bulanan (6 bulan terakhir)
        $monthlyTrend = (clone $baseOrders)
            ->where('Status', 'delivered')
            ->whereNotNull('DeliveredAt')
            ->where('DeliveredAt', '>=', now()->subMonths(5)->startOfMonth())
            ->selectRaw('YEAR(DeliveredAt) as yr, MONTH(DeliveredAt) as mo, COUNT(*) as cnt')
            ->groupBy(DB::raw('YEAR(DeliveredAt)'), DB::raw('MONTH(DeliveredAt)'))
            ->orderBy(DB::raw('YEAR(DeliveredAt)'))->orderBy(DB::raw('MONTH(DeliveredAt)'))
            ->get()
            ->map(fn ($r) => [
                'label' => Carbon::createFromDate($r->yr, $r->mo, 1)->locale('id')->isoFormat('MMM YY'),
                'count' => (int) $r->cnt,
            ])->values()->all();

        // 5 pengiriman terakhir yang selesai
        $recentDelivered = (clone $baseOrders)->where('Status', 'delivered')
            ->orderByDesc('DeliveredAt')->limit(5)->get();
        $kioskNames = User::whereIn('Email', $recentDelivered->pluck('UserEmail')->unique()->all())
            ->where('Role', 'kiosk')->pluck('KioskName', 'Email')->all();
        $recentOrders = $recentDelivered->map(fn (Order $o) => [
            'id'           => $o->Id,
            'po_number'    => $o->PoNumber,
            'kiosk_name'   => $kioskNames[$o->UserEmail] ?? $o->UserEmail,
            'status'       => $o->Status,
            'delivered_at' => $o->DeliveredAt,
        ])->all();

        return [
            'activeSopir'           => (int) $activeSopir,
            'activeGudang'          => (int) $activeGudang,
            'activeOrders'          => (int) $activeOrders,
            'deliveredOrders'       => (int) $deliveredOrders,
            'unreadNotifications'   => $unreadNotifications,
            'billingDraft'          => (int) ($billingCounts['draft']     ?? 0),
            'billingSubmitted'      => (int) ($billingCounts['submitted'] ?? 0),
            'billingApproved'       => (int) ($billingCounts['approved']  ?? 0),
            'totalApprovedShipping' => $totalApprovedShipping,
            'productTonnage'        => $productTonnage,
            'monthlyTrend'          => $monthlyTrend,
            'recentOrders'          => $recentOrders,
        ];
    }

    private function formatOrders($orders): array
    {
        if ($orders->isEmpty()) return [];

        $emails     = $orders->pluck('UserEmail')->unique()->filter()->values()->all();
        $kioskNames = User::whereIn('Email', $emails)->where('Role', 'kiosk')
            ->pluck('KioskName', 'Email')->all();

        $orderIds      = $orders->pluck('Id')->all();
        $soLineGroups  = SoSubmissionLineOrder::whereIn('order_id', $orderIds)
            ->with('line:id,status')
            ->get()
            ->groupBy('order_id');

        return $orders->map(fn (Order $o) => [
            'id'            => $o->Id,
            'poNumber'      => $o->PoNumber,
            'userEmail'     => $o->UserEmail,
            'kioskName'     => $kioskNames[$o->UserEmail] ?? null,
            'orderStatus'   => $o->OrderStatus,
            'paymentStatus' => $o->PaidAt ? 'paid' : 'pending',
            'soStatus'      => $this->resolveSoStatusForOrder($soLineGroups->get($o->Id, collect())),
            'totalAmount'   => $o->TotalAmount,
            'createdAt'     => $o->CreatedAt,
        ])->all();
    }

    private function adminRegionOrders($user)
    {
        $region = trim($user->Region ?? '');

        if (! $region) {
            return Order::query();
        }

        return Order::whereIn('UserEmail', function ($q) use ($region) {
            $q->select('Email')->from('Users')->where('Role', 'kiosk')->where('Region', $region);
        });
    }
}
