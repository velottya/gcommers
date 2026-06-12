<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SystemNotification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class NotificationController extends Controller
{
    public function index(Request $request)
    {
        $user  = Auth::user();
        $query = SystemNotification::query();

        // Kalau sistem sudah menyimpan notifikasi per-user, pakai scope itu.
        // Jika belum ada data per-user, fallback ke semua notifikasi agar layar tidak kosong.
        if ($user->Role !== 'SuperAdmin' && SystemNotification::where('UserEmail', $user->Email)->exists()) {
            $query->where('UserEmail', $user->Email);
        }

        if ($request->filled('unread_only') && $request->boolean('unread_only')) {
            $query->where('isRead', false);
        }

        $notifications = $query->orderBy('CreatedAt', 'desc')->paginate(30);
        $notifications->getCollection()->transform(fn (SystemNotification $notification) => $this->format($notification));

        return response()->json($notifications);
    }

    public function markRead($id)
    {
        $user         = Auth::user();
        $notification = SystemNotification::findOrFail($id);

        if ($user->Role !== 'SuperAdmin' && $notification->UserEmail && $notification->UserEmail !== $user->Email) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $notification->isRead = true;
        $notification->save();

        return response()->json(['success' => true]);
    }

    public function markAllRead(Request $request)
    {
        $user  = Auth::user();
        $query = SystemNotification::where('isRead', false);

        if ($user->Role !== 'SuperAdmin' && SystemNotification::where('UserEmail', $user->Email)->exists()) {
            $query->where('UserEmail', $user->Email);
        }

        $query->update(['isRead' => true]);

        return response()->json(['success' => true]);
    }

    private function format(SystemNotification $notification): array
    {
        return [
            'id'          => $notification->getKey(),
            'title'       => $notification->Title ?? null,
            'description' => $notification->Description ?? null,
            'userEmail'   => $notification->UserEmail ?? null,
            'createdAt'   => optional($notification->createdAt ?? $notification->CreatedAt ?? null)->toISOString(),
            'isRead'      => (bool) $notification->isRead,
        ];
    }
}
