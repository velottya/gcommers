import React from 'react';

export default function SystemSettings({ user }) {
    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-semibold text-white">System Settings</h1>

            {/* Admin credentials info */}
            <div className="rounded-2xl border border-white/8 bg-slate-950/55 p-6">
                <h2 className="mb-2 text-base font-semibold text-white">Admin Credentials</h2>
                <p className="text-sm text-slate-400 leading-6">
                    Password admin console dikelola melalui artisan command di server. Untuk mengatur atau mereset password admin, jalankan:
                </p>
                <pre className="mt-4 overflow-x-auto rounded-xl border border-white/8 bg-slate-950 p-4 text-sm text-amber-300 font-mono">
{`php artisan admin:set-password {email} {password}`}
                </pre>
                <p className="mt-3 text-xs text-slate-500">
                    Perintah ini akan membuat atau memperbarui credential admin console tanpa menyentuh password aplikasi user (Flutter).
                </p>
            </div>

            {/* Current session */}
            <div className="rounded-2xl border border-white/8 bg-slate-950/55 p-6">
                <h2 className="mb-4 text-base font-semibold text-white">Sesi Aktif</h2>
                <div className="space-y-2 text-sm text-slate-300">
                    <p><span className="text-slate-500">Email:</span> {user.email}</p>
                    <p><span className="text-slate-500">Role:</span> {user.role}</p>
                    <p><span className="text-slate-500">Display name:</span> {user.displayName || '—'}</p>
                </div>
            </div>

            {/* Database posture reminder */}
            <div className="rounded-2xl border border-emerald-400/15 bg-emerald-400/5 p-6">
                <div className="flex items-center gap-3 mb-3">
                    <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs text-emerald-200">Shared DB safe</span>
                    <h2 className="text-base font-semibold text-white">Database Posture</h2>
                </div>
                <ul className="space-y-2 text-sm text-slate-400">
                    <li>Admin console hanya membaca tabel <code className="text-emerald-300">Orders</code>, <code className="text-emerald-300">Products</code>, <code className="text-emerald-300">Users</code>, <code className="text-emerald-300">Notifications</code>.</li>
                    <li>Tabel <code className="text-emerald-300">admin_credentials</code> adalah tabel baru khusus admin console.</li>
                    <li>Tidak ada perubahan schema pada tabel yang digunakan aplikasi user Flutter.</li>
                </ul>
            </div>
        </div>
    );
}
