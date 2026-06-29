<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\TransportBilling;
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

        $billings = $query->orderBy('period', 'desc')->paginate(20);

        return response()->json($billings);
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

        $query->whereYear('DeliveredAt', (int) $year)
              ->whereMonth('DeliveredAt', (int) $month);

        $orders        = $query->with('transportAssignments')->get();
        $totalOrders   = $orders->count();
        $totalShipping = OrderController::totalShippingCost($orders, $company ?: null);
        $totalAmount   = $orders->sum('TotalAmount');

        return response()->json([
            'company_name'   => $company,
            'period'         => $period,
            'total_orders'   => $totalOrders,
            'total_shipping' => $totalShipping,
            'total_amount'   => $totalAmount,
        ]);
    }

    public function store(Request $request)
    {
        $user = Auth::user();
        abort_unless($user->Role === 'AdminTransport', 403, 'Akses tidak diizinkan.');

        $data    = $request->validate(['period' => ['required', 'regex:/^\d{4}-\d{2}$/']]);
        $company = trim($user->CompanyName ?? '');
        $period  = $data['period'];

        abort_if(
            TransportBilling::where('company_name', $company)->where('period', $period)->exists(),
            422,
            'Tagihan untuk periode ini sudah ada.'
        );

        [$year, $month] = explode('-', $period);

        $query = Order::where('Status', 'delivered');
        if ($company) {
            $query->whereHas('transportAssignments', fn ($q) => $q->where('company_name', $company));
        }

        $query->whereYear('DeliveredAt', (int) $year)
              ->whereMonth('DeliveredAt', (int) $month);

        $orders = $query->with('transportAssignments')->get();

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

        $billing = TransportBilling::where('company_name', trim($user->CompanyName ?? ''))
            ->findOrFail($id);

        abort_unless($billing->status === 'draft', 422, 'Tagihan ini sudah diajukan.');

        $billing->update(['status' => 'submitted']);

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
}
