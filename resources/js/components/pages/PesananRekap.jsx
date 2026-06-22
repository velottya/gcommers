import { BarChart3 } from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';
import { api } from '../../api/client';

function currentPeriod() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function formatRupiah(val) {
    if (val == null) return '—';
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);
}

const STATUS_COLOR = {
    pending_payment: 'bg-slate-400/20  text-slate-300',
    paid:            'bg-blue-400/20   text-blue-300',
    shipping:        'bg-amber-400/20  text-amber-300',
    delivered:       'bg-emerald-400/20 text-emerald-300',
    cancelled:       'bg-red-400/20    text-red-300',
};

const STATUS_LABEL = {
    pending_payment: 'Pending',
    paid:            'Sedang Diproses',
    shipping:        'Dalam Perjalanan',
    delivered:       'Selesai',
    cancelled:       'Dibatalkan',
};

function StatusPill({ label, count }) {
    const color = STATUS_COLOR[label] ?? 'bg-slate-400/20 text-slate-300';
    return (
        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${color}`}>
            {STATUS_LABEL[label] ?? label} <span className="font-semibold">{count}</span>
        </span>
    );
}

function VendorRow({ row }) {
    return (
        <div className="rounded-2xl border border-white/8 bg-slate-950/55 p-5">
            <div className="mb-3 flex items-center justify-between">
                <h3 className="font-semibold text-white">{row.vendor}</h3>
                <span className="text-xs text-slate-500">{row.total_orders} order</span>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="rounded-xl border border-white/6 bg-white/3 p-3">
                    <p className="text-xs text-slate-500 uppercase tracking-[0.18em]">Revenue</p>
                    <p className="mt-0.5 font-semibold text-amber-300">{formatRupiah(row.revenue)}</p>
                </div>
                <div className="rounded-xl border border-white/6 bg-white/3 p-3">
                    <p className="text-xs text-slate-500 uppercase tracking-[0.18em]">Ongkos Kirim</p>
                    <p className="mt-0.5 font-semibold text-sky-300">{formatRupiah(row.shipping)}</p>
                </div>
            </div>

            <div className="flex flex-wrap gap-1.5">
                {Object.entries(row.by_status).map(([status, count]) => (
                    <StatusPill key={status} label={status} count={count} />
                ))}
            </div>
        </div>
    );
}

export default function PesananRekap() {
    const [data,    setData]    = useState(null);
    const [loading, setLoading] = useState(true);
    const [error,   setError]   = useState(null);
    const [period,  setPeriod]  = useState('');

    const fetch = useCallback(() => {
        setLoading(true);
        api.get('/orders/recap', period ? { period } : {})
            .then(setData)
            .catch(e => setError(e.message))
            .finally(() => setLoading(false));
    }, [period]);

    useEffect(() => { fetch(); }, [fetch]);

    const totalOrders  = data?.reduce((s, r) => s + r.total_orders, 0) ?? 0;
    const totalRevenue = data?.reduce((s, r) => s + r.revenue, 0) ?? 0;

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-semibold text-white">Rekap Pesanan per Region</h1>
                <p className="mt-1 text-sm text-slate-500">
                    Ringkasan order dari semua region / vendor.
                </p>
            </div>

            {/* Filter */}
            <div className="flex items-center gap-3">
                <input type="month" value={period} onChange={e => setPeriod(e.target.value)}
                    className="rounded-xl border border-white/10 bg-slate-950/50 px-3 py-2.5 text-sm text-slate-300 outline-none focus:border-amber-400/30 transition" />
                {period && (
                    <button onClick={() => setPeriod('')}
                        className="rounded-xl border border-white/10 px-3 py-2.5 text-sm text-slate-500 hover:text-white transition">
                        Semua periode
                    </button>
                )}
            </div>

            {error && (
                <div className="rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-300">{error}</div>
            )}

            {/* Summary banner */}
            {!loading && data && (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                    <div className="rounded-2xl border border-white/8 bg-slate-950/55 p-4">
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Total Region</p>
                        <p className="mt-1 text-2xl font-semibold text-white">{data.length}</p>
                    </div>
                    <div className="rounded-2xl border border-white/8 bg-slate-950/55 p-4">
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Total Order</p>
                        <p className="mt-1 text-2xl font-semibold text-amber-300">{totalOrders}</p>
                    </div>
                    <div className="col-span-2 rounded-2xl border border-white/8 bg-slate-950/55 p-4">
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Total Revenue</p>
                        <p className="mt-1 text-2xl font-semibold text-emerald-300">{formatRupiah(totalRevenue)}</p>
                    </div>
                </div>
            )}

            {/* Per-vendor cards */}
            {loading ? (
                <div className="space-y-3">
                    {[1, 2, 3].map(i => <div key={i} className="h-36 animate-pulse rounded-2xl bg-white/5" />)}
                </div>
            ) : !data?.length ? (
                <div className="flex flex-col items-center gap-3 py-16 text-slate-500">
                    <BarChart3 size={40} strokeWidth={1} />
                    <p className="text-sm">Belum ada data order.</p>
                </div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {data.map(row => <VendorRow key={row.vendor} row={row} />)}
                </div>
            )}
        </div>
    );
}
