<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\OrderCostAllocation;
use App\Models\Setting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class OrderCostAllocationController extends Controller
{
    public function index(Request $request)
    {
        $user  = Auth::user();
        $query = OrderCostAllocation::query();

        if ($user->Role === 'AdminRegion' && $user->Region) {
            $query->where('region', $user->Region);
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('region')) {
            $query->where('region', 'like', '%' . $request->region . '%');
        }

        $allocations = $query->orderBy('created_at', 'desc')->paginate(20);

        // Enrich with PO numbers
        $orderIds = $allocations->pluck('order_id')->all();
        $orders   = Order::whereIn('Id', $orderIds)->get()->keyBy('Id');

        $allocations->getCollection()->transform(function (OrderCostAllocation $a) use ($orders) {
            $order = $orders->get($a->order_id);
            return array_merge($a->toArray(), [
                'poNumber'  => $order?->PoNumber,
                'userEmail' => $order?->UserEmail,
                'vendor'    => $order?->Vendor,
            ]);
        });

        return response()->json($allocations);
    }

    public function show(string $orderId)
    {
        $user       = Auth::user();
        $allocation = $this->findAccessible($orderId, $user);

        return response()->json($allocation);
    }

    public function storeOrUpdate(Request $request)
    {
        $user = Auth::user();
        abort_unless($user->Role === 'AdminRegion', 403, 'Akses tidak diizinkan.');

        $data = $request->validate([
            'order_id'      => 'required|string',
            'shipping_cost' => 'required|numeric|min:0',
            'pph_amount'    => 'required|numeric|min:0',
            'ppn_amount'    => 'required|numeric|min:0',
            'notes'         => 'nullable|string|max:1000',
        ]);

        $region = trim($user->Region ?? '');

        // Pastikan order termasuk region ini
        $order = Order::where('Id', $data['order_id'])
            ->when($region, fn ($q) => $q->where('Vendor', $region))
            ->firstOrFail();

        $total = (float) $data['shipping_cost']
            + (float) $data['pph_amount']
            + (float) $data['ppn_amount'];

        $allocation = OrderCostAllocation::updateOrCreate(
            ['order_id' => (string) $order->Id],
            [
                'region'          => $region,
                'shipping_cost'   => $data['shipping_cost'],
                'pph_amount'      => $data['pph_amount'],
                'ppn_amount'      => $data['ppn_amount'],
                'total_allocated' => $total,
                'notes'           => $data['notes'] ?? null,
                'allocated_by'    => $user->Email,
                'status'          => 'draft',
            ]
        );

        return response()->json($allocation->fresh(), 200);
    }

    public function submit(int $id)
    {
        $user       = Auth::user();
        abort_unless($user->Role === 'AdminRegion', 403, 'Akses tidak diizinkan.');

        $allocation = OrderCostAllocation::where('region', trim($user->Region ?? ''))->findOrFail($id);
        abort_unless($allocation->status === 'draft', 422, 'Alokasi ini sudah diajukan atau sudah diproses.');

        $allocation->update(['status' => 'submitted']);

        return response()->json($allocation->fresh());
    }

    public function approve(Request $request, int $id)
    {
        $user = Auth::user();
        abort_unless($user->Role === 'SuperAdmin', 403, 'Akses tidak diizinkan.');

        $allocation = OrderCostAllocation::findOrFail($id);
        abort_unless($allocation->status === 'submitted', 422, 'Alokasi belum diajukan.');

        $allocation->update([
            'status'      => 'approved',
            'reviewed_by' => $user->Email,
            'reviewed_at' => now(),
            'review_note' => $request->input('review_note'),
        ]);

        return response()->json($allocation->fresh());
    }

    public function reject(Request $request, int $id)
    {
        $user = Auth::user();
        abort_unless($user->Role === 'SuperAdmin', 403, 'Akses tidak diizinkan.');

        $allocation = OrderCostAllocation::findOrFail($id);
        abort_unless($allocation->status === 'submitted', 422, 'Alokasi belum diajukan.');

        $data = $request->validate(['review_note' => 'nullable|string|max:1000']);

        $allocation->update([
            'status'      => 'rejected',
            'reviewed_by' => $user->Email,
            'reviewed_at' => now(),
            'review_note' => $data['review_note'] ?? null,
        ]);

        return response()->json($allocation->fresh());
    }

    // Default fee settings as starting point
    public function defaults()
    {
        abort_unless(
            in_array(Auth::user()?->Role, ['AdminRegion', 'SuperAdmin'], true),
            403
        );

        $map = Setting::allAsMap();

        return response()->json([
            'biaya_pengiriman_dasar'  => (float) ($map['biaya_pengiriman_dasar']['value']  ?? 0),
            'biaya_pengiriman_per_km' => (float) ($map['biaya_pengiriman_per_km']['value'] ?? 0),
            'pph_persen'              => (float) ($map['pph_persen']['value']              ?? 0),
            'ppn_persen'              => (float) ($map['ppn_persen']['value']              ?? 11),
        ]);
    }

    private function findAccessible(string $orderId, $user): OrderCostAllocation
    {
        $query = OrderCostAllocation::where('order_id', $orderId);

        if ($user->Role === 'AdminRegion' && $user->Region) {
            $query->where('region', $user->Region);
        }

        return $query->firstOrFail();
    }
}
