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

        // SuperAdmin melihat semua notifikasi, role lain hanya notifikasi milik mereka
        if ($user->Role !== 'SuperAdmin') {
            $query->where('userEmail', $user->Email);
        }

        if ($request->filled('unread_only') && $request->boolean('unread_only')) {
            $query->where('isRead', false);
        }

        $notifications = $query->orderBy('createdAt', 'desc')->paginate(30);

        return response()->json($notifications);
    }

    public function markRead($id)
    {
        $user         = Auth::user();
        $notification = SystemNotification::findOrFail($id);

        if ($user->Role !== 'SuperAdmin' && $notification->userEmail !== $user->Email) {
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

        if ($user->Role !== 'SuperAdmin') {
            $query->where('userEmail', $user->Email);
        }

        $query->update(['isRead' => true]);

        return response()->json(['success' => true]);
    }
}
