import { Bell, CheckCheck } from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';
import { api } from '../../api/client';
import { Pagination } from '../ui/Table';

function formatDate(val) {
    if (!val) return '—';
    return new Date(val).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
}

export default function NotificationList({ user }) {
    const [data,       setData]       = useState(null);
    const [loading,    setLoading]    = useState(true);
    const [error,      setError]      = useState(null);
    const [page,       setPage]       = useState(1);
    const [unreadOnly, setUnreadOnly] = useState(false);
    const [marking,    setMarking]    = useState(false);

    const fetchNotifs = useCallback(() => {
        setLoading(true);
        api.get('/notifications', { page, unread_only: unreadOnly ? '1' : '' })
            .then(setData)
            .catch(e => setError(e.message))
            .finally(() => setLoading(false));
    }, [page, unreadOnly]);

    useEffect(() => { fetchNotifs(); }, [fetchNotifs]);

    async function markRead(id) {
        await api.patch(`/notifications/${id}/read`);
        setData(prev => ({
            ...prev,
            data: prev.data.map(n => n.id === id ? { ...n, isRead: true } : n),
        }));
    }

    async function markAllRead() {
        setMarking(true);
        try {
            await api.patch('/notifications/read-all');
            fetchNotifs();
        } finally {
            setMarking(false);
        }
    }

    const unreadCount = data?.data?.filter(n => !n.isRead).length ?? 0;

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <h1 className="text-2xl font-semibold text-white">Notifikasi</h1>
                <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 text-sm text-slate-400 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={unreadOnly}
                            onChange={e => { setUnreadOnly(e.target.checked); setPage(1); }}
                            className="rounded border-white/20 bg-slate-950/50 text-amber-400"
                        />
                        Belum dibaca saja
                    </label>
                    {unreadCount > 0 && (
                        <button
                            onClick={markAllRead}
                            disabled={marking}
                            className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-300 hover:text-white disabled:opacity-40 transition"
                        >
                            <CheckCheck size={14} />
                            Tandai semua dibaca
                        </button>
                    )}
                </div>
            </div>

            {error && (
                <div className="rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-300">{error}</div>
            )}

            {loading ? (
                <div className="space-y-3">
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className="h-16 animate-pulse rounded-2xl bg-white/5" />
                    ))}
                </div>
            ) : !data?.data?.length ? (
                <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-white/8 py-16 text-slate-500">
                    <Bell size={32} strokeWidth={1} />
                    <p className="text-sm">Tidak ada notifikasi.</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {data.data.map(notif => (
                        <div
                            key={notif.id}
                            className={`rounded-2xl border p-4 transition
                                ${notif.isRead
                                    ? 'border-white/8 bg-slate-950/30'
                                    : 'border-amber-400/15 bg-amber-400/5'
                                }`}
                        >
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex-1 min-w-0">
                                    <p className={`text-sm font-medium ${notif.isRead ? 'text-slate-300' : 'text-white'}`}>
                                        {notif.Title}
                                    </p>
                                    {notif.Description && (
                                        <p className="mt-1 text-xs text-slate-400 leading-5">{notif.Description}</p>
                                    )}
                                    <p className="mt-2 text-xs text-slate-600">
                                        {notif.userEmail} · {formatDate(notif.createdAt)}
                                    </p>
                                </div>
                                {!notif.isRead && (
                                    <button
                                        onClick={() => markRead(notif.id)}
                                        className="shrink-0 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-slate-400 hover:text-white transition"
                                    >
                                        Tandai dibaca
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <Pagination meta={data} onPageChange={setPage} />
        </div>
    );
}
