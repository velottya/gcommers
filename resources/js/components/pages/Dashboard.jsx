import { AlertCircle, Bell, Building2, CheckCircle2, Circle, Clock, FileText, Package, ShoppingCart, Store, Truck, Users, Warehouse, X, XCircle } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import StatCard from '../ui/StatCard';
import StatusBadge, { OrderStatusBadge } from '../ui/StatusBadge';

// ─── helpers ─────────────────────────────────────────────────────────────────

function formatRupiah(val) {
    if (val == null) return '—';
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);
}

function formatRupiahShort(val) {
    if (val == null) return '—';
    if (val >= 1_000_000_000) return `Rp ${(val / 1_000_000_000).toFixed(1)}M`;
    if (val >= 1_000_000)     return `Rp ${(val / 1_000_000).toFixed(0)}jt`;
    if (val >= 1_000)         return `Rp ${(val / 1_000).toFixed(0)}rb`;
    return `Rp ${val}`;
}

function formatDate(val) {
    if (!val) return '—';
    return new Date(val).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ─── Detail Modal ─────────────────────────────────────────────────────────────

function DetailModal({ modal, onClose }) {
    if (!modal) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={onClose} />
            <div className="relative z-10 w-full max-w-lg rounded-2xl border border-white/10 bg-slate-900 shadow-2xl flex flex-col max-h-[80vh]">
                {/* Header */}
                <div className="flex items-start justify-between border-b border-white/8 px-5 py-4 shrink-0">
                    <div>
                        <h2 className="text-sm font-semibold text-white">{modal.title}</h2>
                        {modal.subtitle && <p className="text-xs text-slate-500 mt-0.5">{modal.subtitle}</p>}
                    </div>
                    <button onClick={onClose} className="ml-4 rounded-lg p-1 text-slate-500 hover:text-white transition shrink-0">
                        <X size={16} />
                    </button>
                </div>
                {/* Body */}
                <div className="overflow-y-auto flex-1 px-5 py-4">
                    {modal.content}
                </div>
            </div>
        </div>
    );
}

function orderField(order, camelKey, pascalKey) {
    return order?.[camelKey] ?? order?.[pascalKey] ?? null;
}

// ─── StatusChecklist (matches OrderList.jsx) ─────────────────────────────────

function StatusChecklist({ paymentStatus, soStatus }) {
    const isPaid = paymentStatus === 'paid';

    let SoIcon = Circle, soColor = 'text-slate-500', soLabel = 'SO Belum';
    if (soStatus === 'approved')  { SoIcon = CheckCircle2; soColor = 'text-emerald-400'; soLabel = 'SO Disetujui'; }
    else if (soStatus === 'submitted') { SoIcon = Clock;   soColor = 'text-amber-400';   soLabel = 'SO Menunggu'; }
    else if (soStatus === 'rejected')  { SoIcon = XCircle; soColor = 'text-red-400';     soLabel = 'SO Ditolak'; }

    return (
        <div className="flex flex-col gap-1">
            <span className={`inline-flex items-center gap-1.5 text-xs ${isPaid ? 'text-emerald-400' : 'text-slate-500'}`}>
                {isPaid ? <CheckCircle2 size={13} /> : <Circle size={13} />}
                {isPaid ? 'Lunas' : 'Belum Lunas'}
            </span>
            <span className={`inline-flex items-center gap-1.5 text-xs ${soColor}`}>
                <SoIcon size={13} />
                {soLabel}
            </span>
        </div>
    );
}

// ─── Status distribution card ─────────────────────────────────────────────────

const STATUS_META = {
    pending:    { label: 'Menunggu',     bar: 'bg-slate-400' },
    paid:       { label: 'Dibayar',      bar: 'bg-teal-400' },
    processing: { label: 'Diproses',     bar: 'bg-amber-400' },
    shipping:   { label: 'Dikirim',      bar: 'bg-sky-400' },
    delivered:  { label: 'Terkirim',     bar: 'bg-emerald-400' },
    cancelled:  { label: 'Dibatalkan',   bar: 'bg-red-400' },
};

function StatusDistCard({ dist, total, loading, onStatusClick }) {
    const entries = Object.entries(dist ?? {});
    return (
        <div className="rounded-2xl border border-white/8 bg-slate-950/55 p-5 flex flex-col gap-4">
            <h3 className="text-sm font-semibold text-white">Status Pesanan</h3>
            {loading ? (
                [...Array(4)].map((_, i) => <div key={i} className="h-8 animate-pulse rounded-lg bg-white/5" />)
            ) : entries.length === 0 ? (
                <p className="text-xs text-slate-500 py-4 text-center">Belum ada data.</p>
            ) : (
                <div className="space-y-3">
                    {entries.map(([status, count]) => {
                        const meta = STATUS_META[status] ?? { label: status, bar: 'bg-slate-400' };
                        const pct  = total ? Math.round((count / total) * 100) : 0;
                        return (
                            <div key={status}
                                className="cursor-pointer group rounded-lg px-1 py-0.5 hover:bg-white/4 transition"
                                onClick={() => onStatusClick?.(status, meta.label)}>
                                <div className="flex justify-between text-xs mb-1.5">
                                    <span className="text-slate-400 group-hover:text-slate-200 transition">{meta.label}</span>
                                    <span className="text-slate-200 font-mono">{count} <span className="text-slate-500">({pct}%)</span></span>
                                </div>
                                <div className="h-1.5 w-full rounded-full bg-white/5">
                                    <div className={`h-full rounded-full ${meta.bar} opacity-60 transition-all`} style={{ width: `${pct}%` }} />
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

// ─── Top kiosk card ───────────────────────────────────────────────────────────

function TopKioskCard({ kiosks, loading }) {
    const max = kiosks?.[0]?.totalAmount ?? 1;
    return (
        <div className="rounded-2xl border border-white/8 bg-slate-950/55 p-5 flex flex-col gap-4">
            <h3 className="text-sm font-semibold text-white">Top 5 Kiosk</h3>
            {loading ? (
                [...Array(5)].map((_, i) => <div key={i} className="h-8 animate-pulse rounded-lg bg-white/5" />)
            ) : !kiosks?.length ? (
                <p className="text-xs text-slate-500 py-4 text-center">Belum ada data.</p>
            ) : (
                <div className="space-y-3">
                    {kiosks.map((k, i) => (
                        <div key={i}>
                            <div className="flex items-center justify-between text-xs mb-1.5 gap-2">
                                <span className="text-slate-300 truncate">{k.name}</span>
                                <span className="text-teal-300 font-mono shrink-0">{formatRupiahShort(k.totalAmount)}</span>
                            </div>
                            <div className="h-1.5 w-full rounded-full bg-white/5">
                                <div className="h-full rounded-full bg-teal-400/50 transition-all"
                                    style={{ width: `${max > 0 ? (k.totalAmount / max) * 100 : 0}%` }} />
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// ─── Pending submissions card ─────────────────────────────────────────────────

const PENDING_ITEMS = [
    { key: 'so',           label: 'Pengajuan SO',     route: '/so-submissions',  cls: 'border-amber-400/20 bg-amber-400/10 text-amber-300  hover:bg-amber-400/15' },
    { key: 'hargaProduk',  label: 'Harga Produk',     route: '/harga-produk',    cls: 'border-sky-400/20   bg-sky-400/10   text-sky-300    hover:bg-sky-400/15'   },
    { key: 'quotaSubsidi', label: 'Quota Subsidi',    route: '/quota-subsidi',   cls: 'border-violet-400/20 bg-violet-400/10 text-violet-300 hover:bg-violet-400/15' },
];

function PendingCard({ pending, loading, navigate }) {
    return (
        <div className="rounded-2xl border border-white/8 bg-slate-950/55 p-5 flex flex-col gap-4">
            <div>
                <h3 className="text-sm font-semibold text-white">Pengajuan Menunggu</h3>
                <p className="text-xs text-slate-500 mt-0.5">Menunggu persetujuan SuperAdmin</p>
            </div>
            <div className="space-y-2.5">
                {PENDING_ITEMS.map(item => (
                    <button key={item.key} onClick={() => navigate(item.route)}
                        className={`w-full flex items-center justify-between rounded-xl border px-3 py-2.5 text-xs font-medium transition ${item.cls}`}>
                        <span>{item.label}</span>
                        <span className="text-base font-bold">
                            {loading ? '—' : (pending?.[item.key] ?? 0)}
                        </span>
                    </button>
                ))}
            </div>
        </div>
    );
}

// ─── Recharts custom tooltip ──────────────────────────────────────────────────

function SalesTooltip({ active, payload, label }) {
    if (!active || !payload?.length) return null;
    return (
        <div className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2.5 shadow-xl text-xs">
            <p className="text-slate-400 mb-1">{label}</p>
            <p className="text-teal-300 font-semibold">{formatRupiah(payload[0]?.value)}</p>
            <p className="text-slate-500 mt-0.5">{payload[0]?.payload?.count} pesanan</p>
        </div>
    );
}

// ─── Recent orders table ──────────────────────────────────────────────────────

const RECENT_HEADERS = ['No Pesanan', 'Nama Kiosk', 'Total', 'Status Pemesanan', 'Keterangan', 'Tanggal'];

function RecentOrders({ orders, loading, navigate }) {
    return (
        <div className="rounded-2xl border border-white/8 bg-slate-950/55 p-5">
            <div className="mb-4 flex items-center justify-between">
                <h2 className="text-base font-semibold text-white">Order Terbaru</h2>
                <button onClick={() => navigate('/orders')}
                    className="text-xs text-slate-400 hover:text-amber-300 transition">
                    Lihat semua →
                </button>
            </div>
            {loading ? (
                <div className="space-y-2">
                    {[...Array(5)].map((_, i) => <div key={i} className="h-10 animate-pulse rounded-lg bg-white/5" />)}
                </div>
            ) : !orders?.length ? (
                <p className="py-6 text-center text-sm text-slate-500">Belum ada order.</p>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-white/8">
                                {RECENT_HEADERS.map(h => (
                                    <th key={h} className="pb-2 pr-4 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 last:pr-0">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {orders.map(order => (
                                <tr key={order.id} className="cursor-pointer hover:bg-white/3 transition"
                                    onClick={() => navigate(`/orders/${order.id}`)}>
                                    <td className="py-2.5 pr-4 font-mono text-xs text-slate-200">
                                        {orderField(order, 'poNumber', 'PoNumber')}
                                    </td>
                                    <td className="py-2.5 pr-4 text-slate-300 max-w-[140px] truncate">
                                        {order.kioskName || orderField(order, 'userEmail', 'UserEmail')}
                                    </td>
                                    <td className="py-2.5 pr-4 text-slate-200">
                                        {formatRupiah(orderField(order, 'totalAmount', 'TotalAmount'))}
                                    </td>
                                    <td className="py-2.5 pr-4">
                                        <OrderStatusBadge value={orderField(order, 'orderStatus', 'OrderStatus')} />
                                    </td>
                                    <td className="py-2.5 pr-4">
                                        <StatusChecklist
                                            paymentStatus={orderField(order, 'paymentStatus', 'PaymentStatus')}
                                            soStatus={order.soStatus}
                                        />
                                    </td>
                                    <td className="py-2.5 text-slate-400 text-xs">
                                        {formatDate(orderField(order, 'createdAt', 'CreatedAt'))}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

// ─── AdminRegion dashboard ────────────────────────────────────────────────────

const SALES_MODES = [
    { key: 'weekly',   label: 'Mingguan'    },
    { key: 'monthly',  label: 'Bulanan'     },
    { key: 'allTime',  label: 'Semua Waktu' },
];

function AdminRegionDashboard({ user }) {
    const [data,      setData]      = useState(null);
    const [loading,   setLoading]   = useState(true);
    const [error,     setError]     = useState(null);
    const [salesMode, setSalesMode] = useState('monthly');
    const navigate                  = useNavigate();

    useEffect(() => {
        api.get('/dashboard/stats')
            .then(setData)
            .catch(e => setError(e.message))
            .finally(() => setLoading(false));
    }, []);

    const chartData = salesMode === 'weekly'  ? data?.salesWeekly
                    : salesMode === 'monthly' ? data?.salesMonthly
                    : data?.salesAllTime;

    const statCards = [
        { label: 'Total Pesanan',      value: data?.totalOrders,           icon: ShoppingCart, accent: 'text-teal-300'   },
        { label: 'Total Kiosk',        value: data?.totalKiosk,            icon: Store,        accent: 'text-amber-300'  },
        { label: 'Total Gudang',       value: data?.totalGudang,           icon: Building2,    accent: 'text-violet-300' },
        { label: 'Mitra Transportir',  value: data?.totalMitraTransportir, icon: Truck,        accent: 'text-sky-300'    },
        { label: 'Total Sopir',        value: data?.totalSopir,            icon: Users,        accent: 'text-emerald-300'},
        { label: 'Total Produk',       value: data?.totalProducts,         icon: Package,      accent: 'text-rose-300'   },
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-semibold text-white">Dashboard</h1>
                <p className="mt-1 text-sm text-slate-400">Region: <span className="text-teal-400 font-medium">{user.region || '—'}</span></p>
            </div>

            {error && (
                <div className="rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-300">
                    Gagal memuat data: {error}
                </div>
            )}

            {/* 6 stat cards */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
                {statCards.map(s => (
                    <StatCard key={s.label} label={s.label} value={loading ? undefined : s.value}
                        icon={s.icon} accent={s.accent} loading={loading} />
                ))}
            </div>

            {/* Sales chart */}
            <div className="rounded-2xl border border-white/8 bg-slate-950/55 p-5">
                {/* Chart header */}
                <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <h2 className="text-base font-semibold text-white">Grafik Penjualan</h2>
                        <p className="text-xs text-slate-500 mt-0.5">Akumulasi nilai pesanan yang sudah dibayar</p>
                    </div>
                    <div className="flex gap-1 rounded-xl border border-white/8 bg-white/3 p-1">
                        {SALES_MODES.map(({ key, label }) => (
                            <button key={key} onClick={() => setSalesMode(key)}
                                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition
                                    ${salesMode === key ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-slate-300'}`}>
                                {label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Accumulation totals */}
                <div className="mb-5 flex flex-wrap items-center gap-6">
                    <div>
                        <p className="text-xs text-slate-500">7 Hari Terakhir</p>
                        <p className="mt-0.5 text-sm font-semibold text-teal-300">
                            {loading ? '…' : formatRupiah(data?.salesTotals?.weekly)}
                        </p>
                    </div>
                    <div className="h-8 w-px bg-white/8" />
                    <div>
                        <p className="text-xs text-slate-500">Bulan Ini</p>
                        <p className="mt-0.5 text-sm font-semibold text-amber-300">
                            {loading ? '…' : formatRupiah(data?.salesTotals?.monthly)}
                        </p>
                    </div>
                    <div className="h-8 w-px bg-white/8" />
                    <div>
                        <p className="text-xs text-slate-500">Semua Waktu</p>
                        <p className="mt-0.5 text-sm font-semibold text-violet-300">
                            {loading ? '…' : formatRupiah(data?.salesTotals?.allTime)}
                        </p>
                    </div>
                </div>

                {/* Area chart */}
                {loading ? (
                    <div className="h-[220px] animate-pulse rounded-xl bg-white/5" />
                ) : !chartData?.length ? (
                    <div className="flex h-[220px] items-center justify-center text-sm text-slate-500">Belum ada data penjualan.</div>
                ) : (
                    <ResponsiveContainer width="100%" height={220}>
                        <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                            <defs>
                                <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%"  stopColor="#2dd4bf" stopOpacity={0.25} />
                                    <stop offset="95%" stopColor="#2dd4bf" stopOpacity={0}    />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                            <XAxis dataKey="label"
                                tick={{ fill: '#64748b', fontSize: 10 }}
                                axisLine={false} tickLine={false} />
                            <YAxis
                                tickFormatter={formatRupiahShort}
                                tick={{ fill: '#64748b', fontSize: 10 }}
                                axisLine={false} tickLine={false}
                                width={64} />
                            <Tooltip content={<SalesTooltip />} />
                            <Area type="monotone" dataKey="total"
                                stroke="#2dd4bf" strokeWidth={2}
                                fill="url(#salesGrad)" dot={false} activeDot={{ r: 4, fill: '#2dd4bf' }} />
                        </AreaChart>
                    </ResponsiveContainer>
                )}
            </div>

            {/* Middle row: 3 columns */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <StatusDistCard dist={data?.orderStatusDistribution} total={data?.totalOrders} loading={loading} />
                <TopKioskCard   kiosks={data?.topKiosks}             loading={loading} />
                <PendingCard    pending={data?.pendingSubmissions}    loading={loading} navigate={navigate} />
            </div>

            {/* Recent orders */}
            <RecentOrders orders={data?.recentOrders} loading={loading} navigate={navigate} />
        </div>
    );
}

// ─── AdminTransport Dashboard ────────────────────────────────────────────────

const PRODUCT_COLORS = ['#2dd4bf', '#38bdf8', '#a78bfa', '#fb923c', '#f472b6', '#facc15'];

function TonnageTooltip({ active, payload }) {
    if (!active || !payload?.length) return null;
    return (
        <div className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2 shadow-xl text-xs">
            <p className="text-slate-400 mb-1">{payload[0]?.payload?.product}</p>
            <p className="font-semibold" style={{ color: payload[0]?.fill }}>{payload[0]?.value} ton</p>
            <p className="text-slate-500 mt-0.5">{payload[0]?.payload?.trip_count} pengiriman</p>
        </div>
    );
}

function TrendTooltip({ active, payload, label }) {
    if (!active || !payload?.length) return null;
    return (
        <div className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2 shadow-xl text-xs">
            <p className="text-slate-400 mb-1">{label}</p>
            <p className="text-emerald-300 font-semibold">{payload[0]?.value} pesanan terkirim</p>
        </div>
    );
}

function AdminTransportDashboard({ user }) {
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

    const sk = (w = 'w-24', h = 'h-8') => (
        <div className={`${w} ${h} animate-pulse rounded-lg bg-white/5`} />
    );

    const totalTon = (data?.productTonnage ?? []).reduce((s, p) => s + p.total_ton, 0);

    return (
        <div className="space-y-6">

            {/* ── Header ── */}
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-2xl font-semibold text-white">Dashboard Operasional</h1>
                    <p className="mt-1 text-sm text-slate-400">
                        <span className="text-sky-400 font-medium">{user.companyName || '—'}</span>
                        {user.region && <span className="text-slate-600"> · {user.region}</span>}
                    </p>
                </div>
                <button onClick={() => navigate('/rekap-tagihan')}
                    className="flex items-center gap-2 rounded-xl border border-sky-400/30 bg-sky-400/10 px-4 py-2 text-xs font-medium text-sky-300 hover:bg-sky-400/20 transition">
                    <FileText size={14} /> Rekap Tagihan
                </button>
            </div>

            {error && (
                <div className="rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-300">
                    Gagal memuat data: {error}
                </div>
            )}

            {/* ── Row 1: 4 stat cards ── */}
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                {[
                    { label: 'Sopir Aktif',       key: 'activeSopir',     icon: Users,     border: 'border-teal-400/15',    bg: 'bg-teal-400/5',    icon_bg: 'bg-teal-400/10',    icon_c: 'text-teal-400',    val_c: 'text-teal-300',    sub: 'terdaftar di perusahaan ini' },
                    { label: 'Gudang Aktif',       key: 'activeGudang',    icon: Warehouse, border: 'border-violet-400/15',  bg: 'bg-violet-400/5',  icon_bg: 'bg-violet-400/10',  icon_c: 'text-violet-400',  val_c: 'text-violet-300',  sub: 'di wilayah region ini' },
                    { label: 'Pesanan Aktif',      key: 'activeOrders',    icon: Truck,     border: 'border-amber-400/15',   bg: 'bg-amber-400/5',   icon_bg: 'bg-amber-400/10',   icon_c: 'text-amber-400',   val_c: 'text-amber-300',   sub: 'sedang dalam proses kirim' },
                    { label: 'Total Terkirim',     key: 'deliveredOrders', icon: CheckCircle2, border: 'border-emerald-400/15', bg: 'bg-emerald-400/5', icon_bg: 'bg-emerald-400/10', icon_c: 'text-emerald-400', val_c: 'text-emerald-300', sub: 'pesanan selesai dikirim' },
                ].map(card => (
                    <div key={card.key} className={`rounded-2xl border ${card.border} ${card.bg} p-5`}>
                        <div className="flex items-center gap-2 mb-3">
                            <div className={`rounded-lg ${card.icon_bg} p-1.5`}>
                                <card.icon size={15} className={card.icon_c} />
                            </div>
                            <p className={`text-xs font-semibold uppercase tracking-[0.12em] ${card.icon_c} opacity-80`}>{card.label}</p>
                        </div>
                        {loading ? sk('w-16', 'h-9') : (
                            <>
                                <p className={`text-3xl font-bold ${card.val_c}`}>{data?.[card.key] ?? 0}</p>
                                <p className="mt-1 text-xs text-slate-500">{card.sub}</p>
                            </>
                        )}
                    </div>
                ))}
            </div>

            {/* ── Row 2: Billing summary + Tren pengiriman ── */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">

                {/* Billing overview */}
                <div className="rounded-2xl border border-white/8 bg-slate-950/55 p-5 space-y-4">
                    <div className="flex items-center gap-2">
                        <FileText size={15} className="text-sky-400" />
                        <h3 className="text-sm font-semibold text-white">Tagihan</h3>
                    </div>

                    {loading ? (
                        <div className="space-y-2">{[1,2,3].map(i => sk('w-full', 'h-10'))}</div>
                    ) : (
                        <>
                            <div className="space-y-2">
                                {[
                                    { label: 'Draft',      key: 'billingDraft',      color: 'bg-slate-400/20 text-slate-300', dot: 'bg-slate-400' },
                                    { label: 'Diajukan',   key: 'billingSubmitted',  color: 'bg-amber-400/10 text-amber-300',  dot: 'bg-amber-400' },
                                    { label: 'Disetujui',  key: 'billingApproved',   color: 'bg-emerald-400/10 text-emerald-300', dot: 'bg-emerald-400' },
                                ].map(item => (
                                    <div key={item.key} className={`flex items-center justify-between rounded-xl px-3 py-2.5 ${item.color}`}>
                                        <div className="flex items-center gap-2 text-xs font-medium">
                                            <div className={`w-2 h-2 rounded-full ${item.dot}`} />
                                            {item.label}
                                        </div>
                                        <span className="text-base font-bold">{data?.[item.key] ?? 0}</span>
                                    </div>
                                ))}
                            </div>
                            <div className="border-t border-white/8 pt-3">
                                <p className="text-xs text-slate-500 mb-1">Total Ongkos Tertagih</p>
                                <p className="text-lg font-bold text-emerald-300">
                                    {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(data?.totalApprovedShipping ?? 0)}
                                </p>
                                <p className="text-xs text-slate-500 mt-0.5">dari tagihan yang disetujui</p>
                            </div>
                        </>
                    )}
                </div>

                {/* Monthly trend chart */}
                <div className="lg:col-span-2 rounded-2xl border border-white/8 bg-slate-950/55 p-5">
                    <div className="mb-4">
                        <h3 className="text-sm font-semibold text-white">Tren Pengiriman Bulanan</h3>
                        <p className="text-xs text-slate-500 mt-0.5">Jumlah pesanan terkirim per bulan (6 bulan terakhir)</p>
                    </div>
                    {loading ? (
                        <div className="h-[180px] animate-pulse rounded-xl bg-white/5" />
                    ) : !data?.monthlyTrend?.length ? (
                        <div className="flex h-[180px] items-center justify-center text-sm text-slate-500">Belum ada data pengiriman.</div>
                    ) : (
                        <ResponsiveContainer width="100%" height={180}>
                            <BarChart data={data.monthlyTrend} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                <XAxis dataKey="label" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
                                <Tooltip content={<TrendTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                                <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={40}>
                                    {(data?.monthlyTrend ?? []).map((_, i, arr) => (
                                        <Cell key={i} fill={i === arr.length - 1 ? '#10b981' : '#10b98155'} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </div>

            {/* ── Row 3: Tonase + Recent deliveries ── */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">

                {/* Product tonnage */}
                <div className="lg:col-span-2 rounded-2xl border border-white/8 bg-slate-950/55 p-5 space-y-4">
                    <div>
                        <h3 className="text-sm font-semibold text-white">Tonase per Produk</h3>
                        <p className="text-xs text-slate-500 mt-0.5">Akumulasi dari semua pesanan terkirim</p>
                    </div>

                    {loading ? (
                        <div className="space-y-3">{[1,2,3].map(i => sk('w-full', 'h-12'))}</div>
                    ) : !data?.productTonnage?.length ? (
                        <p className="py-6 text-center text-sm text-slate-500">Belum ada data pengiriman.</p>
                    ) : (
                        <>
                            <div className="space-y-3">
                                {data.productTonnage.map((p, i) => {
                                    const pct = totalTon > 0 ? (p.total_ton / totalTon) * 100 : 0;
                                    const color = PRODUCT_COLORS[i % PRODUCT_COLORS.length];
                                    return (
                                        <div key={i}>
                                            <div className="flex items-center justify-between text-xs mb-1.5">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
                                                    <span className="text-slate-300 truncate max-w-[120px]">{p.product}</span>
                                                </div>
                                                <div className="text-right shrink-0 ml-2">
                                                    <span className="font-bold" style={{ color }}>{p.total_ton} ton</span>
                                                    <span className="text-slate-600 ml-1">({p.trip_count}×)</span>
                                                </div>
                                            </div>
                                            <div className="h-1.5 w-full rounded-full bg-white/5">
                                                <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color, opacity: 0.6 }} />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                            <div className="border-t border-white/8 pt-3 flex items-center justify-between">
                                <span className="text-xs text-slate-500">Total Tonase Terkirim</span>
                                <span className="text-sm font-bold text-white">{totalTon.toLocaleString('id-ID')} ton</span>
                            </div>
                        </>
                    )}
                </div>

                {/* Recent deliveries */}
                <div className="lg:col-span-3 rounded-2xl border border-white/8 bg-slate-950/55 p-5">
                    <div className="mb-4 flex items-center justify-between">
                        <div>
                            <h3 className="text-sm font-semibold text-white">Pengiriman Terakhir</h3>
                            <p className="text-xs text-slate-500 mt-0.5">5 pesanan terakhir yang selesai dikirim</p>
                        </div>
                        <button onClick={() => navigate('/alokasi-sopir')}
                            className="text-xs text-slate-400 hover:text-sky-300 transition">
                            Lihat semua →
                        </button>
                    </div>

                    {loading ? (
                        <div className="space-y-2">{[1,2,3,4,5].map(i => sk('w-full', 'h-11'))}</div>
                    ) : !data?.recentOrders?.length ? (
                        <p className="py-8 text-center text-sm text-slate-500">Belum ada pesanan terkirim.</p>
                    ) : (
                        <div className="space-y-2">
                            {data.recentOrders.map((o, i) => (
                                <div key={i} className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/3 px-4 py-3 hover:bg-white/5 transition cursor-pointer"
                                    onClick={() => navigate('/alokasi-sopir')}>
                                    <div className="rounded-lg bg-emerald-400/10 p-1.5 shrink-0">
                                        <CheckCircle2 size={14} className="text-emerald-400" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-xs font-mono text-slate-300">{o.po_number}</p>
                                        <p className="text-xs text-slate-500 truncate">{o.kiosk_name}</p>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <p className="text-xs text-slate-400">
                                            {o.delivered_at
                                                ? new Date(o.delivered_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: '2-digit' })
                                                : '—'}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// ─── SuperAdmin Dashboard ─────────────────────────────────────────────────────

const PENDING_SA_ITEMS = [
    { key: 'so',      label: 'Pengajuan SO',  cls: 'border-amber-400/20  bg-amber-400/10  text-amber-300  hover:bg-amber-400/15'  },
    { key: 'harga',   label: 'Harga Produk',  cls: 'border-sky-400/20    bg-sky-400/10    text-sky-300    hover:bg-sky-400/15'    },
    { key: 'quota',   label: 'Quota Subsidi', cls: 'border-violet-400/20 bg-violet-400/10 text-violet-300 hover:bg-violet-400/15' },
    { key: 'gudang',  label: 'Ajuan Gudang',  cls: 'border-teal-400/20   bg-teal-400/10   text-teal-300   hover:bg-teal-400/15'   },
    { key: 'billing', label: 'Tagihan',       cls: 'border-rose-400/20   bg-rose-400/10   text-rose-300   hover:bg-rose-400/15'   },
];

function buildMatrix(data, productKey = 'product', regionKey = 'region') {
    const regions  = [...new Set(data.map(r => r[regionKey]))].sort();
    const products = [...new Set(data.map(r => r[productKey]))].sort();
    const map      = {};
    data.forEach(r => { map[`${r[regionKey]}|${r[productKey]}`] = r; });
    return { regions, products, map };
}

function OrderMonthlyTooltip({ active, payload, label }) {
    if (!active || !payload?.length) return null;
    return (
        <div className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2.5 shadow-xl text-xs">
            <p className="text-slate-400 mb-1">{label}</p>
            <p className="text-teal-300 font-semibold">{payload[0]?.value} pesanan</p>
            {payload[0]?.payload?.total > 0 &&
                <p className="text-amber-300 mt-0.5">{formatRupiahShort(payload[0].payload.total)}</p>
            }
        </div>
    );
}

const DATA_TABS = [
    { key: 'tagihan', label: 'Tagihan Transportir' },
    { key: 'harga',   label: 'Harga Produk'        },
    { key: 'quota',   label: 'Quota Subsidi'        },
];

function DataTabsSection({ loading, billingStats, topBillings, priceMatrix, stockMatrix, pricesDetail = [], stockDetail = [], onOpenModal, navigate }) {
    const [activeTab, setActiveTab] = useState('tagihan');

    return (
        <div className="rounded-2xl border border-white/8 bg-slate-950/55 overflow-hidden">
            {/* Tab header */}
            <div className="flex border-b border-white/8 px-1 pt-1 gap-1">
                {DATA_TABS.map(tab => (
                    <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                        className={`px-4 py-2.5 text-xs font-medium rounded-t-lg transition
                            ${activeTab === tab.key
                                ? 'bg-white/8 text-white border-b-2 border-teal-400'
                                : 'text-slate-500 hover:text-slate-300'}`}>
                        {tab.label}
                    </button>
                ))}
            </div>

            <div className="p-5">
                {/* ── Tab: Tagihan ── */}
                {activeTab === 'tagihan' && (
                    loading ? (
                        <div className="space-y-2">
                            {[1, 2, 3].map(i => <div key={i} className="h-10 animate-pulse rounded-lg bg-white/5" />)}
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="space-y-2">
                                {[
                                    { label: 'Draft',     key: 'draft',     color: 'bg-slate-400/10 text-slate-300',     dot: 'bg-slate-400'    },
                                    { label: 'Diajukan',  key: 'submitted', color: 'bg-amber-400/10 text-amber-300',     dot: 'bg-amber-400'    },
                                    { label: 'Disetujui', key: 'approved',  color: 'bg-emerald-400/10 text-emerald-300', dot: 'bg-emerald-400'  },
                                ].map(item => {
                                    const row = billingStats?.[item.key];
                                    return (
                                        <div key={item.key} className={`flex items-center justify-between rounded-xl px-3 py-2.5 ${item.color}`}>
                                            <div className="flex items-center gap-2 text-xs font-medium">
                                                <div className={`w-2 h-2 rounded-full shrink-0 ${item.dot}`} />
                                                <span>{item.label}</span>
                                                <span className="text-slate-500 font-normal">({row?.count ?? 0}×)</span>
                                            </div>
                                            <span className="text-sm font-bold">{formatRupiahShort(row?.total ?? 0)}</span>
                                        </div>
                                    );
                                })}
                            </div>
                            {topBillings?.length > 0 && (
                                <div className="border-t border-white/8 pt-3">
                                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2.5">Top Mitra Transportir</p>
                                    <div className="space-y-2">
                                        {topBillings.slice(0, 5).map((b, i) => (
                                            <div key={i}
                                                className="flex items-center justify-between text-xs gap-2 -mx-2 px-2 py-1 rounded-lg cursor-pointer hover:bg-white/5 transition"
                                                onClick={() => navigate?.('/persetujuan')}>
                                                <span className="text-slate-300 truncate">{b.company}</span>
                                                <span className="text-emerald-300 font-bold shrink-0">{formatRupiahShort(b.total)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )
                )}

                {/* ── Tab: Harga Produk ── */}
                {activeTab === 'harga' && (
                    loading ? (
                        <div className="h-28 animate-pulse rounded-xl bg-white/5" />
                    ) : !priceMatrix.regions.length ? (
                        <p className="py-6 text-center text-xs text-slate-500">Belum ada data harga produk.</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-xs">
                                <thead>
                                    <tr className="border-b border-white/8">
                                        <th className="pb-2.5 pr-6 text-left font-semibold uppercase tracking-wider text-slate-500 whitespace-nowrap">Wilayah</th>
                                        {priceMatrix.products.map(p => (
                                            <th key={p} className="pb-2.5 px-4 text-center font-semibold uppercase tracking-wider text-slate-500 whitespace-nowrap">{p}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {priceMatrix.regions.map(region => (
                                        <tr key={region} className="hover:bg-white/3 transition">
                                            <td className="py-3 pr-6 font-medium text-slate-200 whitespace-nowrap">{region}</td>
                                            {priceMatrix.products.map(product => {
                                                const cell = priceMatrix.map[`${region}|${product}`];
                                                const openPriceModal = () => {
                                                    const rows = pricesDetail.filter(r => r.region === region && r.product === product);
                                                    onOpenModal?.({
                                                        title: `Harga ${product}`,
                                                        subtitle: `${region} · ${rows.length} kecamatan`,
                                                        content: rows.length === 0 ? (
                                                            <p className="text-xs text-slate-500 py-2">Belum ada data kecamatan.</p>
                                                        ) : (
                                                            <table className="w-full text-xs">
                                                                <thead><tr className="border-b border-white/8">
                                                                    <th className="pb-2 pr-4 text-left font-semibold uppercase tracking-wider text-slate-500">Kecamatan</th>
                                                                    <th className="pb-2 text-right font-semibold uppercase tracking-wider text-slate-500">Harga / Kg</th>
                                                                </tr></thead>
                                                                <tbody className="divide-y divide-white/5">
                                                                    {rows.map(r => (
                                                                        <tr key={r.kecamatan}>
                                                                            <td className="py-2 pr-4 text-slate-300">{r.kecamatan}</td>
                                                                            <td className="py-2 text-right text-teal-300 font-medium font-mono">{formatRupiah(r.price)}</td>
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                        ),
                                                    });
                                                };
                                                if (!cell) return (
                                                    <td key={product} className="py-3 px-4 text-center text-slate-600 cursor-pointer hover:bg-white/5 transition" onClick={openPriceModal}>—</td>
                                                );
                                                const isSame = cell.min_price === cell.max_price;
                                                return (
                                                    <td key={product} className="py-3 px-4 text-center whitespace-nowrap cursor-pointer hover:bg-white/5 transition" onClick={openPriceModal}>
                                                        {isSame
                                                            ? <span className="text-teal-300 font-medium">{formatRupiahShort(cell.min_price)}</span>
                                                            : <span className="text-amber-300 font-medium">{formatRupiahShort(cell.min_price)}–{formatRupiahShort(cell.max_price)}</span>
                                                        }
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )
                )}

                {/* ── Tab: Quota Subsidi ── */}
                {activeTab === 'quota' && (
                    loading ? (
                        <div className="h-28 animate-pulse rounded-xl bg-white/5" />
                    ) : !stockMatrix.regions.length ? (
                        <p className="py-6 text-center text-xs text-slate-500">Belum ada data quota subsidi.</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-xs">
                                <thead>
                                    <tr className="border-b border-white/8">
                                        <th className="pb-2.5 pr-6 text-left font-semibold uppercase tracking-wider text-slate-500 whitespace-nowrap">Wilayah</th>
                                        {stockMatrix.products.map(p => (
                                            <th key={p} className="pb-2.5 px-4 text-center font-semibold uppercase tracking-wider text-slate-500 whitespace-nowrap">{p}</th>
                                        ))}
                                        <th className="pb-2.5 px-4 text-center font-semibold uppercase tracking-wider text-slate-500 whitespace-nowrap">Total</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {stockMatrix.regions.map(region => {
                                        const rowTotal = stockMatrix.products.reduce((sum, p) =>
                                            sum + (stockMatrix.map[`${region}|${p}`]?.total_ton ?? 0), 0);
                                        return (
                                            <tr key={region} className="hover:bg-white/3 transition">
                                                <td className="py-3 pr-6 font-medium text-slate-200 whitespace-nowrap">{region}</td>
                                                {stockMatrix.products.map(product => {
                                                    const cell = stockMatrix.map[`${region}|${product}`];
                                                    const openStockModal = () => {
                                                        const rows = stockDetail.filter(r => r.region === region && r.product === product);
                                                        onOpenModal?.({
                                                            title: `Quota ${product}`,
                                                            subtitle: `${region} · ${rows.length} kecamatan`,
                                                            content: rows.length === 0 ? (
                                                                <p className="text-xs text-slate-500 py-2">Belum ada data kecamatan.</p>
                                                            ) : (
                                                                <table className="w-full text-xs">
                                                                    <thead><tr className="border-b border-white/8">
                                                                        <th className="pb-2 pr-4 text-left font-semibold uppercase tracking-wider text-slate-500">Kecamatan</th>
                                                                        <th className="pb-2 pr-4 text-right font-semibold uppercase tracking-wider text-slate-500">Quota</th>
                                                                        <th className="pb-2 text-right font-semibold uppercase tracking-wider text-slate-500">Periode</th>
                                                                    </tr></thead>
                                                                    <tbody className="divide-y divide-white/5">
                                                                        {rows.map(r => (
                                                                            <tr key={r.kecamatan}>
                                                                                <td className="py-2 pr-4 text-slate-300">{r.kecamatan}</td>
                                                                                <td className="py-2 pr-4 text-right text-violet-300 font-medium font-mono">{r.quota_ton.toLocaleString('id-ID')} ton</td>
                                                                                <td className="py-2 text-right text-slate-500">{r.period ?? '—'}</td>
                                                                            </tr>
                                                                        ))}
                                                                    </tbody>
                                                                </table>
                                                            ),
                                                        });
                                                    };
                                                    return (
                                                        <td key={product} className="py-3 px-4 text-center cursor-pointer hover:bg-white/5 transition" onClick={openStockModal}>
                                                            {cell
                                                                ? <span className="text-violet-300 font-medium">{cell.total_ton.toLocaleString('id-ID')} ton</span>
                                                                : <span className="text-slate-600">—</span>
                                                            }
                                                        </td>
                                                    );
                                                })}
                                                <td className="py-3 px-4 text-center font-bold text-white whitespace-nowrap">
                                                    {rowTotal.toLocaleString('id-ID')} ton
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )
                )}
            </div>
        </div>
    );
}

function SuperAdminDashboard({ user }) {
    const [data,    setData]    = useState(null);
    const [loading, setLoading] = useState(true);
    const [error,   setError]   = useState(null);
    const [modal,   setModal]   = useState(null);
    const navigate              = useNavigate();

    useEffect(() => {
        api.get('/dashboard/stats')
            .then(setData)
            .catch(e => setError(e.message))
            .finally(() => setLoading(false));
    }, []);

    const stockMatrix = React.useMemo(() => buildMatrix(data?.stockByRegion  ?? []), [data]);
    const priceMatrix = React.useMemo(() => buildMatrix(data?.pricesByRegion ?? []), [data]);

    const totalPending = Object.values(data?.pendingApprovals ?? {}).reduce((a, b) => a + b, 0);

    const statCards = [
        { label: 'Total Kiosk',        value: data?.totalKiosk,       icon: Store,        accent: 'text-teal-300',    onClick: () => navigate('/app-users')       },
        { label: 'Total Sopir',        value: data?.totalSopir,       icon: Users,        accent: 'text-emerald-300', onClick: () => navigate('/alokasi-sopir')   },
        { label: 'Total Gudang',       value: data?.totalGudang,      icon: Warehouse,    accent: 'text-violet-300',  onClick: () => navigate('/daftar-gudang')   },
        { label: 'Mitra Transportir',  value: data?.totalMitra,       icon: Truck,        accent: 'text-sky-300',     onClick: () => navigate('/admin-transport') },
        { label: 'Pesanan Bulan Ini',  value: data?.ordersThisMonth,  icon: ShoppingCart, accent: 'text-amber-300',   onClick: () => navigate('/orders')          },
        { label: 'Total Pesanan',      value: data?.totalOrders,      icon: Package,      accent: 'text-rose-300',    onClick: () => navigate('/orders')          },
    ];

    return (
        <div className="space-y-6">

            {/* ── Header ── */}
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-semibold text-white">Dashboard SuperAdmin</h1>
                    <p className="mt-1 text-sm text-slate-400">Ringkasan global semua wilayah</p>
                </div>
                {!loading && totalPending > 0 && (
                    <button onClick={() => navigate('/persetujuan')}
                        className="flex shrink-0 items-center gap-2 rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-2 text-xs font-medium text-amber-300 hover:bg-amber-400/20 transition">
                        <AlertCircle size={14} />
                        {totalPending} menunggu persetujuan
                    </button>
                )}
            </div>

            {error && (
                <div className="rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-300">
                    Gagal memuat data: {error}
                </div>
            )}

            {/* ── Menunggu Persetujuan: full width ── */}
            <div className="rounded-2xl border border-white/8 bg-slate-950/55 p-5">
                <div className="mb-3">
                    <h3 className="text-sm font-semibold text-white">Menunggu Persetujuan</h3>
                    <p className="text-xs text-slate-500 mt-0.5">Klik untuk membuka halaman persetujuan ajuan</p>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                    {PENDING_SA_ITEMS.map(item => (
                        <button key={item.key}
                            onClick={() => navigate('/persetujuan')}
                            className={`flex flex-col items-center gap-1.5 rounded-xl border px-3 py-3 text-xs font-medium transition ${item.cls}`}>
                            <span className="text-2xl font-bold">
                                {loading ? '—' : (data?.pendingApprovals?.[item.key] ?? 0)}
                            </span>
                            <span className="opacity-80 text-center leading-tight">{item.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* ── 6 Stat Cards: 3 kolom di mobile, 6 kolom di desktop ── */}
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                {statCards.map(s => (
                    <StatCard key={s.label} label={s.label}
                        value={loading ? undefined : s.value}
                        icon={s.icon} accent={s.accent} loading={loading} compact
                        onClick={s.onClick} />
                ))}
            </div>

            {/* ── Tren Pesanan: full width ── */}
            <div className="rounded-2xl border border-white/8 bg-slate-950/55 p-5">
                <div className="mb-4">
                    <h3 className="text-sm font-semibold text-white">Tren Pesanan (12 Bulan Terakhir)</h3>
                    <p className="text-xs text-slate-500 mt-0.5">Jumlah pesanan per bulan dari semua wilayah</p>
                </div>
                {loading ? (
                    <div className="h-[200px] animate-pulse rounded-xl bg-white/5" />
                ) : !data?.orderMonthly?.length ? (
                    <div className="flex h-[200px] items-center justify-center text-sm text-slate-500">Belum ada data.</div>
                ) : (
                    <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={data.orderMonthly} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                            <XAxis dataKey="label" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
                            <Tooltip content={<OrderMonthlyTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                            <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={40}>
                                {(data.orderMonthly).map((_, i, arr) => (
                                    <Cell key={i} fill={i === arr.length - 1 ? '#2dd4bf' : '#2dd4bf55'} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                )}
            </div>

            {/* ── Status Pesanan: full width ── */}
            <StatusDistCard
                dist={data?.orderStatusDistribution}
                total={data?.totalOrders}
                loading={loading}
                onStatusClick={() => navigate('/orders')} />

            {/* ── Tagihan · Harga · Quota dalam satu section bertab ── */}
            <DataTabsSection
                loading={loading}
                billingStats={data?.billingStats}
                topBillings={data?.topBillings}
                priceMatrix={priceMatrix}
                stockMatrix={stockMatrix}
                pricesDetail={data?.pricesDetail ?? []}
                stockDetail={data?.stockDetail ?? []}
                onOpenModal={setModal}
                navigate={navigate}
            />

            {/* ── Recent Orders: full width ── */}
            <RecentOrders orders={data?.recentOrders} loading={loading} navigate={navigate} />

            <DetailModal modal={modal} onClose={() => setModal(null)} />
        </div>
    );
}

// ─── Generic dashboard (SuperAdmin + AdminTransport) ─────────────────────────

const ROLE_CONFIG = {
    SuperAdmin: {
        stats: (d) => [
            { label: 'Total Orders',       value: d.totalOrders,         icon: ShoppingCart, accent: 'text-amber-300' },
            { label: 'Total Products',     value: d.totalProducts,       icon: Package,      accent: 'text-teal-300'  },
            { label: 'Admin Users',        value: d.totalAdminUsers,     icon: Users,        accent: 'text-sky-300'   },
            { label: 'Notif Belum Dibaca', value: d.unreadNotifications, icon: Bell,         accent: 'text-rose-300'  },
        ],
    },
    AdminTransport: {
        stats: (d) => [
            { label: 'Order Aktif',        value: d.assignedOrders,      icon: Truck,        accent: 'text-sky-300'     },
            { label: 'Sudah Dikirim',      value: d.deliveredOrders,     icon: ShoppingCart, accent: 'text-emerald-300' },
            { label: 'Notif Belum Dibaca', value: d.unreadNotifications, icon: Bell,         accent: 'text-rose-300'    },
        ],
    },
};

function GenericDashboard({ user }) {
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
            <div>
                <h1 className="text-2xl font-semibold text-white">Dashboard</h1>
                <p className="mt-1 text-sm text-slate-400">
                    {user.role === 'SuperAdmin'     && 'Ringkasan global semua region'}
                    {user.role === 'AdminTransport' && `Transportir: ${user.companyName || '—'}`}
                </p>
            </div>

            {error && (
                <div className="rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-300">
                    Gagal memuat data: {error}
                </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {loading
                    ? [...Array(4)].map((_, i) => <StatCard key={i} loading label="…" />)
                    : stats.map(s => <StatCard key={s.label} {...s} />)
                }
            </div>

            <div className="rounded-2xl border border-white/8 bg-slate-950/55 p-5">
                <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-base font-semibold text-white">Order Terbaru</h2>
                    <button
                        onClick={() => navigate(user.role === 'AdminTransport' ? '/alokasi-sopir' : '/orders')}
                        className="text-xs text-slate-400 hover:text-amber-300 transition">
                        Lihat semua →
                    </button>
                </div>
                {loading ? (
                    <div className="space-y-2">
                        {[...Array(5)].map((_, i) => <div key={i} className="h-10 animate-pulse rounded-lg bg-white/5" />)}
                    </div>
                ) : !data?.recentOrders?.length ? (
                    <p className="py-6 text-center text-sm text-slate-500">Belum ada order.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-white/8">
                                    {['PO Number', 'Email', 'Vendor', 'Total', 'Status', 'Tanggal'].map(h => (
                                        <th key={h} className="pb-2 pr-4 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 last:pr-0">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {data.recentOrders.map(order => (
                                    <tr key={order.id} className="cursor-pointer hover:bg-white/3 transition"
                                        onClick={() => navigate(`/orders/${order.id}`)}>
                                        <td className="py-2.5 pr-4 font-mono text-xs text-slate-200">{orderField(order, 'poNumber', 'PoNumber')}</td>
                                        <td className="py-2.5 pr-4 text-slate-300 max-w-[160px] truncate">{orderField(order, 'userEmail', 'UserEmail')}</td>
                                        <td className="py-2.5 pr-4 text-slate-300">{orderField(order, 'vendor', 'Vendor') || '—'}</td>
                                        <td className="py-2.5 pr-4 text-slate-200">{formatRupiah(orderField(order, 'totalAmount', 'TotalAmount'))}</td>
                                        <td className="py-2.5 pr-4"><StatusBadge value={orderField(order, 'status', 'Status')} /></td>
                                        <td className="py-2.5 text-slate-400">{formatDate(orderField(order, 'createdAt', 'CreatedAt'))}</td>
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

// ─── Entry point ──────────────────────────────────────────────────────────────

export default function Dashboard({ user }) {
    if (user.role === 'AdminTransport') return <AdminTransportDashboard user={user} />;
    if (user.role === 'AdminRegion')    return <AdminRegionDashboard user={user} />;
    if (user.role === 'SuperAdmin')     return <SuperAdminDashboard user={user} />;
    return <GenericDashboard user={user} />;
}
