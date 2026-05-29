import { Bell, Package, ShoppingCart, Truck, Users } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import StatCard from '../ui/StatCard';
import StatusBadge from '../ui/StatusBadge';

function formatRupiah(val) {
    if (val == null) return '—';
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);
}

function formatDate(val) {
    if (!val) return '—';
    return new Date(val).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

const ROLE_CONFIG = {
    SuperAdmin: {
        stats: (d) => [
            { label: 'Total Orders',       value: d.totalOrders,         icon: ShoppingCart, accent: 'text-amber-300' },
            { label: 'Total Products',     value: d.totalProducts,       icon: Package,      accent: 'text-teal-300' },
            { label: 'Admin Users',        value: d.totalAdminUsers,     icon: Users,        accent: 'text-sky-300' },
            { label: 'Notif Belum Dibaca', value: d.unreadNotifications, icon: Bell,         accent: 'text-rose-300' },
        ],
    },
    AdminRegion: {
        stats: (d) => [
            { label: 'Orders Region',      value: d.totalOrders,         icon: ShoppingCart, accent: 'text-teal-300' },
            { label: 'Total Produk',       value: d.totalProducts,       icon: Package,      accent: 'text-sky-300' },
            { label: 'Notif Belum Dibaca', value: d.unreadNotifications, icon: Bell,         accent: 'text-rose-300' },
        ],
    },
    AdminTransport: {
        stats: (d) => [
            { label: 'Order Aktif',        value: d.assignedOrders,      icon: Truck,        accent: 'text-sky-300' },
            { label: 'Sudah Dikirim',      value: d.deliveredOrders,     icon: ShoppingCart, accent: 'text-emerald-300' },
            { label: 'Notif Belum Dibaca', value: d.unreadNotifications, icon: Bell,         accent: 'text-rose-300' },
        ],
    },
};

export default function Dashboard({ user }) {
    const [data,    setData]    = useState(null);
    const [loading, setLoading] = useState(true);
    const [error,   setError]   = useState(null);
    const navigate              = useNavigate();

    useEffect(() => {
        api.get('/dashboard/stats')
            .then(setData)
            .catch(e => setError(e.message))
            .finally(() => setLoading(false));
    }, []);

    const cfg   = ROLE_CONFIG[user.role];
    const stats = data && cfg ? cfg.stats(data) : [];

    return (
        <div className="space-y-6">
            {/* Page header */}
            <div>
                <h1 className="text-2xl font-semibold text-white">Dashboard</h1>
                <p className="mt-1 text-sm text-slate-400">
                    {user.role === 'SuperAdmin' && 'Ringkasan global semua region'}
                    {user.role === 'AdminRegion' && `Region: ${user.region || '—'}`}
                    {user.role === 'AdminTransport' && `Transportir: ${user.companyName || '—'}`}
                </p>
            </div>

            {error && (
                <div className="rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-300">
                    Gagal memuat data: {error}
                </div>
            )}

            {/* Stats grid */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {loading
                    ? [...Array(4)].map((_, i) => <StatCard key={i} loading label="…" />)
                    : stats.map(s => <StatCard key={s.label} {...s} />)
                }
            </div>

            {/* Recent orders */}
            <div className="rounded-2xl border border-white/8 bg-slate-950/55 p-5">
                <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-base font-semibold text-white">Order Terbaru</h2>
                    <button
                        onClick={() => navigate('/orders')}
                        className="text-xs text-slate-400 hover:text-amber-300 transition"
                    >
                        Lihat semua →
                    </button>
                </div>

                {loading ? (
                    <div className="space-y-2">
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className="h-10 animate-pulse rounded-lg bg-white/5" />
                        ))}
                    </div>
                ) : !data?.recentOrders?.length ? (
                    <p className="py-6 text-center text-sm text-slate-500">Belum ada order.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-white/8">
                                    {['PO Number', 'Email', 'Vendor', 'Total', 'Status', 'Tanggal'].map(h => (
                                        <th key={h} className="pb-2 pr-4 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 last:pr-0">
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {data.recentOrders.map(order => (
                                    <tr
                                        key={order.id}
                                        className="cursor-pointer hover:bg-white/3 transition"
                                        onClick={() => navigate(`/orders/${order.id}`)}
                                    >
                                        <td className="py-2.5 pr-4 font-mono text-xs text-slate-200">{order.poNumber}</td>
                                        <td className="py-2.5 pr-4 text-slate-300 max-w-[160px] truncate">{order.userEmail}</td>
                                        <td className="py-2.5 pr-4 text-slate-300">{order.vendor || '—'}</td>
                                        <td className="py-2.5 pr-4 text-slate-200">{formatRupiah(order.totalAmount)}</td>
                                        <td className="py-2.5 pr-4"><StatusBadge value={order.status} /></td>
                                        <td className="py-2.5 text-slate-400">{formatDate(order.createdAt)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
