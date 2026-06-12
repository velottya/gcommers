<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\OrderDriverAssignment;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class DriverAssignmentController extends Controller
{
    public function index(Request $request)
    {
        $user    = Auth::user();
        $this->ensureAdminTransport($user);

        $company = trim($user->CompanyName ?? '');
        $query   = Order::query();

        if ($company) {
            $query->where('Vendor', $company);
        }

        if ($request->filled('status')) {
            $query->where('Status', $request->status);
        }

        $orders = $query->orderBy('CreatedAt', 'desc')->paginate(20);

        $orderIds    = $orders->pluck('Id')->all();
        $assignments = OrderDriverAssignment::whereIn('order_id', $orderIds)
            ->get()
            ->keyBy('order_id');

        $orders->getCollection()->transform(function (Order $o) use ($assignments) {
            $asgn = $assignments->get((string) $o->Id);
            return [
                'id'               => $o->Id,
                'poNumber'         => $o->PoNumber,
                'userEmail'        => $o->UserEmail,
                'status'           => $o->Status,
                'createdAt'        => $o->CreatedAt,
                'assignmentId'     => $asgn?->id,
                'transportirEmail' => $asgn?->transportir_email,
                'assignmentNote'   => $asgn?->note,
            ];
        });

        return response()->json($orders);
    }

    public function store(Request $request)
    {
        $user = Auth::user();
        $this->ensureAdminTransport($user);

        $data = $request->validate([
            'order_id'         => 'required|string',
            'transportir_email' => 'required|email',
            'note'             => 'nullable|string|max:500',
        ]);

        $company = trim($user->CompanyName ?? '');

        // Pastikan order memang milik company ini
        $order = Order::where('Id', $data['order_id'])
            ->when($company, fn ($q) => $q->where('Vendor', $company))
            ->firstOrFail();

        // Pastikan transportir_email adalah user Transportir di company yang sama
        abort_unless(
            User::where('Email', $data['transportir_email'])
                ->where('Role', 'Transportir')
                ->when($company, fn ($q) => $q->where('CompanyName', $company))
                ->exists(),
            422,
            'Driver tidak ditemukan di perusahaan Anda.'
        );

        $assignment = OrderDriverAssignment::updateOrCreate(
            ['order_id' => (string) $order->Id],
            [
                'transportir_email' => $data['transportir_email'],
                'assigned_by'       => $user->Email,
                'note'              => $data['note'] ?? null,
            ]
        );

        return response()->json($assignment, 201);
    }

    public function destroy(int $id)
    {
        $user = Auth::user();
        $this->ensureAdminTransport($user);

        $company    = trim($user->CompanyName ?? '');
        $assignment = OrderDriverAssignment::findOrFail($id);

        // Pastikan order assignment ini memang dari company yang sama
        if ($company) {
            $order = Order::where('Id', $assignment->order_id)->where('Vendor', $company)->first();
            abort_unless($order !== null, 403, 'Akses tidak diizinkan.');
        }

        $assignment->delete();

        return response()->noContent();
    }

    private function ensureAdminTransport($user): void
    {
        abort_unless($user->Role === 'AdminTransport', 403, 'Akses tidak diizinkan.');
    }
}
