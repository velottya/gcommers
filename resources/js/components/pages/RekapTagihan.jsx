import { CheckCircle2, Clock, Download, FileText, RefreshCw, Send, ShoppingCart, Truck, User, Wallet, X } from 'lucide-react';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../../api/client';
import { Pagination, Table } from '../ui/Table';

function currentPeriod() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function formatRupiah(val) {
    if (val == null) return '—';
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);
}

function formatPeriod(val) {
    if (!val) return '—';
    const [y, m] = val.split('-');
    const names = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
    return `${names[parseInt(m, 10) - 1]} ${y}`;
}

function formatDate(val) {
    if (!val) return '—';
    return new Date(val).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

const STATUS_CFG = {
    draft:     { label: 'Draft',      color: 'text-slate-300 bg-slate-400/10 border-slate-400/20' },
    submitted: { label: 'Diajukan',   color: 'text-amber-300 bg-amber-400/10 border-amber-400/20' },
    approved:  { label: 'Disetujui',  color: 'text-emerald-300 bg-emerald-400/10 border-emerald-400/20' },
    rejected:  { label: 'Ditolak',    color: 'text-red-300 bg-red-400/10 border-red-400/20' },
};

function StatusChip({ value }) {
    const cfg = STATUS_CFG[value] ?? STATUS_CFG.draft;
    return (
        <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${cfg.color}`}>
            {cfg.label}
        </span>
    );
}

// ── Detail Drawer ─────────────────────────────────────────────────────────────

function BillingDetailDrawer({ billingId, onClose }) {
    const [detail,  setDetail]  = useState(null);
    const [loading, setLoading] = useState(true);
    const [error,   setError]   = useState(null);
    const drawerRef = useRef(null);

    useEffect(() => {
        if (!billingId) return;
        setLoading(true);
        setError(null);
        api.get(`/transport-billings/${billingId}`)
            .then(setDetail)
            .catch(e => setError(e.message || 'Gagal memuat detail tagihan.'))
            .finally(() => setLoading(false));
    }, [billingId]);

    // Close on backdrop click
    function handleBackdrop(e) {
        if (e.target === e.currentTarget) onClose();
    }

    // Close on Escape
    useEffect(() => {
        function onKey(e) { if (e.key === 'Escape') onClose(); }
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [onClose]);

    const billing = detail?.billing;
    const driverRows = detail?.driver_rows ?? [];
    const periodLabel = detail?.period_label ?? '';

    const statusNote = billing ? {
        approved:  { bg: 'bg-emerald-400/8 border-emerald-400/20', text: 'text-emerald-300' },
        rejected:  { bg: 'bg-red-400/8 border-red-400/20',         text: 'text-red-300' },
        submitted: { bg: 'bg-amber-400/8 border-amber-400/20',      text: 'text-amber-300' },
        draft:     { bg: 'bg-slate-400/8 border-slate-400/20',      text: 'text-slate-400' },
    }[billing.status] : null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
            onClick={handleBackdrop}
        >
            <div
                ref={drawerRef}
                className="relative flex w-full max-w-2xl max-h-[85vh] flex-col bg-[#0d1117] border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
                style={{ animation: 'fadeScaleIn 0.18s ease-out' }}
            >
                {/* ── Header ── */}
                <div className="flex items-start justify-between gap-4 border-b border-white/8 px-6 py-4">
                    <div>
                        {billing ? (
                            <>
                                <div className="flex items-center gap-2.5">
                                    <span className="text-xs font-mono text-slate-500">
                                        TAG-{String(billing.id).padStart(5, '0')}
                                    </span>
                                    <StatusChip value={billing.status} />
                                </div>
                                <h2 className="mt-1 text-lg font-semibold text-white">
                                    Tagihan {periodLabel}
                                </h2>
                                <p className="text-xs text-slate-500 mt-0.5">{billing.company_name}</p>
                            </>
                        ) : (
                            <div className="h-6 w-40 animate-pulse rounded bg-white/5" />
                        )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        {billing && billing.status === 'approved' && (
                            <a
                                href={`/api/admin/transport-billings/${billingId}/download`}
                                target="_blank" rel="noreferrer"
                                className="flex items-center gap-1.5 rounded-lg border border-sky-400/30 bg-sky-400/10 px-3 py-1.5 text-xs font-medium text-sky-300 hover:bg-sky-400/20 transition"
                            >
                                <Download size={13} /> Unduh PDF
                            </a>
                        )}
                        <button
                            onClick={onClose}
                            className="rounded-lg p-1.5 text-slate-500 hover:text-white hover:bg-white/5 transition"
                        >
                            <X size={18} />
                        </button>
                    </div>
                </div>

                {/* ── Body ── */}
                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

                    {loading && (
                        <div className="space-y-3">
                            {[1,2,3,4].map(i => (
                                <div key={i} className="h-14 animate-pulse rounded-xl bg-white/5" />
                            ))}
                        </div>
                    )}

                    {error && (
                        <div className="rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-300">
                            {error}
                        </div>
                    )}

                    {!loading && billing && (
                        <>
                            {/* Summary grid */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="rounded-xl border border-white/8 bg-white/3 px-4 py-3">
                                    <p className="text-xs text-slate-500 mb-1">Periode</p>
                                    <p className="text-sm font-semibold text-white">{periodLabel}</p>
                                </div>
                                <div className="rounded-xl border border-white/8 bg-white/3 px-4 py-3">
                                    <p className="text-xs text-slate-500 mb-1">Total Pesanan</p>
                                    <p className="text-sm font-semibold text-white">{billing.total_orders} pesanan</p>
                                </div>
                                <div className="rounded-xl border border-sky-400/15 bg-sky-400/5 px-4 py-3">
                                    <p className="text-xs text-sky-400/70 mb-1">Total Ongkos Kirim</p>
                                    <p className="text-sm font-bold text-sky-300">{formatRupiah(billing.total_shipping)}</p>
                                </div>
                                <div className="rounded-xl border border-white/8 bg-white/3 px-4 py-3">
                                    <p className="text-xs text-slate-500 mb-1">Diajukan Oleh</p>
                                    <p className="text-sm font-semibold text-white truncate">{billing.submitted_by || '—'}</p>
                                </div>
                                {billing.reviewed_by && (
                                    <>
                                        <div className="rounded-xl border border-white/8 bg-white/3 px-4 py-3">
                                            <p className="text-xs text-slate-500 mb-1">Ditinjau Oleh</p>
                                            <p className="text-sm font-semibold text-white truncate">{billing.reviewed_by}</p>
                                        </div>
                                        <div className="rounded-xl border border-white/8 bg-white/3 px-4 py-3">
                                            <p className="text-xs text-slate-500 mb-1">Tanggal Tinjauan</p>
                                            <p className="text-sm font-semibold text-white">{formatDate(billing.reviewed_at)}</p>
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* Note box */}
                            {billing.note && (
                                <div className={`rounded-xl border px-4 py-3 text-sm ${statusNote?.bg} ${statusNote?.text}`}>
                                    <span className="font-semibold">Catatan:</span> {billing.note}
                                </div>
                            )}

                            {/* Per-driver breakdown */}
                            {driverRows.length > 0 ? (
                                <div className="space-y-4">
                                    <h3 className="text-xs font-semibold uppercase tracking-[0.15em] text-teal-400/80 border-b border-teal-400/20 pb-2">
                                        Rincian per Sopir
                                    </h3>

                                    {driverRows.map((d, di) => (
                                        <div key={di} className="rounded-xl border border-white/8 overflow-hidden">
                                            {/* Driver header */}
                                            <div className="flex items-start gap-3 bg-white/4 px-4 py-3 border-b border-white/8">
                                                <div className="mt-0.5 rounded-lg bg-teal-400/10 p-1.5">
                                                    <User size={13} className="text-teal-400" />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-sm font-semibold text-white">{d.driver_name}</p>
                                                    {(d.truck_label || d.police_number) && (
                                                        <div className="flex items-center gap-1.5 mt-0.5 text-xs text-slate-500">
                                                            <Truck size={11} />
                                                            <span>{d.truck_label || ''}</span>
                                                            {d.police_number && (
                                                                <span className="font-mono">&middot; {d.police_number}</span>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="ml-auto text-right shrink-0">
                                                    <p className="text-xs text-slate-500">Subtotal</p>
                                                    <p className="text-sm font-bold text-teal-300">
                                                        {d.subtotal > 0 ? formatRupiah(d.subtotal) : '—'}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Delivery rows */}
                                            <div className="divide-y divide-white/5">
                                                {d.rows.map((row, ri) => (
                                                    <div key={ri} className="px-4 py-2.5 grid grid-cols-[1fr_auto] gap-x-4 gap-y-0.5">
                                                        <div className="min-w-0">
                                                            <p className="text-xs font-mono text-slate-400 truncate">{row.po_number || '—'}</p>
                                                            <p className="text-xs text-slate-300 truncate">{row.kiosk_name}</p>
                                                        </div>
                                                        <div className="text-right shrink-0">
                                                            <p className="text-xs text-slate-400">{row.product_name}</p>
                                                            <p className="text-xs text-slate-500">{row.quota_ton} ton</p>
                                                        </div>
                                                        <div className="col-span-2 flex items-center justify-between mt-1">
                                                            <span className="text-xs text-slate-600">
                                                                {row.rate_per_kg != null
                                                                    ? `Tarif: ${formatRupiah(row.rate_per_kg)}/kg`
                                                                    : 'Tarif tidak ditemukan'}
                                                            </span>
                                                            <span className={`text-xs font-semibold ${row.cost != null ? 'text-sky-300' : 'text-slate-600'}`}>
                                                                {row.cost != null ? formatRupiah(row.cost) : '—'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}

                                    {/* Grand total */}
                                    <div className="flex items-center justify-between rounded-xl border border-teal-400/20 bg-teal-400/5 px-5 py-3">
                                        <span className="text-sm font-semibold text-slate-300">Total Biaya Pengiriman</span>
                                        <span className="text-base font-bold text-teal-300">{formatRupiah(billing.total_shipping)}</span>
                                    </div>
                                </div>
                            ) : (
                                <div className="rounded-xl border border-white/8 bg-white/3 py-8 text-center text-sm text-slate-500">
                                    Belum ada data alokasi sopir untuk periode ini.
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            <style>{`
                @keyframes fadeScaleIn {
                    from { transform: scale(0.95); opacity: 0; }
                    to   { transform: scale(1);    opacity: 1; }
                }
            `}</style>
        </div>
    );
}

// ── Summary cards ─────────────────────────────────────────────────────────────

function SummaryCards({ summary, loadingSummary }) {
    const skeleton = <div className="h-8 w-32 animate-pulse rounded-lg bg-white/5 mt-1.5" />;

    return (
        <div className="grid grid-cols-3 gap-4">
            <div className="rounded-2xl border border-sky-400/15 bg-sky-400/5 p-5">
                <div className="flex items-center gap-2 mb-3">
                    <div className="rounded-lg bg-sky-400/10 p-1.5">
                        <ShoppingCart size={15} className="text-sky-400" />
                    </div>
                    <p className="text-xs font-semibold uppercase tracking-[0.15em] text-sky-400/80">Total Pesanan</p>
                </div>
                {loadingSummary ? skeleton : (
                    <>
                        <p className="text-3xl font-bold text-sky-300">{summary?.unbilled_orders ?? 0}</p>
                        <p className="mt-1 text-xs text-slate-500">pesanan terkirim belum ditagih</p>
                    </>
                )}
            </div>

            <div className="rounded-2xl border border-amber-400/15 bg-amber-400/5 p-5">
                <div className="flex items-center gap-2 mb-3">
                    <div className="rounded-lg bg-amber-400/10 p-1.5">
                        <Clock size={15} className="text-amber-400" />
                    </div>
                    <p className="text-xs font-semibold uppercase tracking-[0.15em] text-amber-400/80">Belum Ditagihkan</p>
                </div>
                {loadingSummary ? skeleton : (
                    <>
                        <p className="text-xl font-bold text-amber-300">{formatRupiah(summary?.unbilled_shipping)}</p>
                        <p className="mt-1 text-xs text-slate-500">estimasi ongkos belum masuk tagihan</p>
                    </>
                )}
            </div>

            <div className="rounded-2xl border border-emerald-400/15 bg-emerald-400/5 p-5">
                <div className="flex items-center gap-2 mb-3">
                    <div className="rounded-lg bg-emerald-400/10 p-1.5">
                        <CheckCircle2 size={15} className="text-emerald-400" />
                    </div>
                    <p className="text-xs font-semibold uppercase tracking-[0.15em] text-emerald-400/80">Total Ongkos Tertagih</p>
                </div>
                {loadingSummary ? skeleton : (
                    <>
                        <p className="text-xl font-bold text-emerald-300">{formatRupiah(summary?.all_time_shipping)}</p>
                        <p className="mt-1 text-xs text-slate-500">akumulasi dari tagihan disetujui</p>
                    </>
                )}
            </div>
        </div>
    );
}

// ── Preview card ──────────────────────────────────────────────────────────────

function PreviewCard({ period, onCreated }) {
    const [data,    setData]    = useState(null);
    const [loading, setLoading] = useState(false);
    const [error,   setError]   = useState(null);
    const [saving,  setSaving]  = useState(false);
    const [saved,   setSaved]   = useState(false);

    useEffect(() => {
        if (!period) return;
        setLoading(true);
        setError(null);
        api.get('/transport-billings/preview', { period })
            .then(setData)
            .catch(e => setError(e.message))
            .finally(() => setLoading(false));
    }, [period]);

    async function handleGenerate() {
        setSaving(true);
        setError(null);
        try {
            await api.post('/transport-billings', { period });
            setSaved(true);
            onCreated?.();
            setTimeout(() => setSaved(false), 4000);
        } catch (err) {
            setError(err.message || 'Gagal membuat tagihan.');
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="rounded-2xl border border-white/8 bg-slate-950/55 p-6">
            <div className="flex items-center gap-2 mb-4">
                <Wallet size={16} className="text-sky-400" />
                <h2 className="text-base font-semibold text-white">Preview Tagihan — {formatPeriod(period)}</h2>
            </div>

            {error && (
                <div className="mb-4 rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-300">{error}</div>
            )}
            {saved && (
                <div className="mb-4 rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-300">
                    Tagihan draft berhasil dibuat. Ajukan dari tabel riwayat di bawah.
                </div>
            )}

            {loading ? (
                <div className="grid grid-cols-2 gap-4">
                    {[1, 2].map(i => <div key={i} className="h-20 animate-pulse rounded-xl bg-white/5" />)}
                </div>
            ) : data ? (
                <>
                    <div className="grid grid-cols-2 gap-4 mb-5">
                        <div className="rounded-xl border border-white/8 bg-white/3 px-4 py-3.5">
                            <p className="text-xs uppercase tracking-[0.15em] text-slate-500">Pesanan Bulan Ini</p>
                            <p className="mt-1.5 text-3xl font-bold text-white">{data.total_orders}</p>
                            <p className="mt-0.5 text-xs text-slate-500">pesanan terkirim {formatPeriod(period)}</p>
                        </div>
                        <div className="rounded-xl border border-sky-400/15 bg-sky-400/5 px-4 py-3.5">
                            <p className="text-xs uppercase tracking-[0.15em] text-sky-400/70">Ongkos Kirim</p>
                            <p className="mt-1.5 text-xl font-bold text-sky-300">{formatRupiah(data.total_shipping)}</p>
                            <p className="mt-0.5 text-xs text-slate-500">estimasi tagihan bulan ini</p>
                        </div>
                    </div>

                    <button
                        onClick={handleGenerate}
                        disabled={saving || data.total_orders === 0}
                        className="flex items-center gap-2 rounded-xl bg-sky-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-sky-400 disabled:opacity-50 transition"
                    >
                        <FileText size={15} />
                        {saving ? 'Membuat…' : 'Buat Tagihan Draft'}
                    </button>
                    {data.total_orders === 0 && (
                        <p className="mt-2 text-xs text-slate-500">Belum ada pesanan terkirim bulan ini.</p>
                    )}
                </>
            ) : null}
        </div>
    );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function RekapTagihan({ user }) {
    const [data,           setData]           = useState(null);
    const [loading,        setLoading]        = useState(true);
    const [error,          setError]          = useState(null);
    const [page,           setPage]           = useState(1);
    const [period,         setPeriod]         = useState('');
    const [summary,        setSummary]        = useState(null);
    const [loadingSummary, setLoadingSummary] = useState(true);
    const [selectedId,     setSelectedId]     = useState(null);
    const [recalcLoading,  setRecalcLoading]  = useState(null);

    const fetchList = useCallback(() => {
        setLoading(true);
        api.get('/transport-billings', { page, ...(period ? { period } : {}) })
            .then(setData)
            .catch(e => setError(e.message))
            .finally(() => setLoading(false));
    }, [page, period]);

    useEffect(() => { fetchList(); }, [fetchList]);

    useEffect(() => {
        setLoadingSummary(true);
        api.get('/transport-billings/summary')
            .then(setSummary)
            .catch(() => {})
            .finally(() => setLoadingSummary(false));
    }, []);

    async function handleSubmit(e, id) {
        e.stopPropagation();
        try {
            await api.post(`/transport-billings/${id}/submit`);
            fetchList();
        } catch (err) {
            alert(err.message || 'Gagal mengajukan tagihan.');
        }
    }

    async function handleRecalculate(e, id) {
        e.stopPropagation();
        setRecalcLoading(id);
        try {
            await api.post(`/transport-billings/${id}/recalculate`);
            fetchList();
        } catch (err) {
            alert(err.message || 'Gagal menghitung ulang tagihan.');
        } finally {
            setRecalcLoading(null);
        }
    }

    async function handleRecalcThenSubmit(e, id) {
        e.stopPropagation();
        setRecalcLoading(id);
        try {
            await api.post(`/transport-billings/${id}/recalculate`);
            await api.post(`/transport-billings/${id}/submit`);
            fetchList();
        } catch (err) {
            alert(err.message || 'Gagal mengajukan ulang tagihan.');
        } finally {
            setRecalcLoading(null);
        }
    }

    const columns = [
        { key: 'period',         label: 'Periode',       render: r => formatPeriod(r.period) },
        { key: 'total_orders',   label: 'Jml Pesanan' },
        { key: 'total_shipping', label: 'Ongkos Kirim',  render: r => <span className="text-sky-300">{formatRupiah(r.total_shipping)}</span> },
        { key: 'status',         label: 'Status',        render: r => <StatusChip value={r.status} /> },
        { key: 'reviewed_by',    label: 'Ditinjau Oleh', render: r => r.reviewed_by ? <span className="text-xs text-slate-400">{r.reviewed_by}</span> : <span className="text-slate-600">—</span> },
        { key: 'note',           label: 'Catatan',       render: r => r.note ? <span className="text-xs text-slate-400 max-w-[160px] block truncate">{r.note}</span> : <span className="text-slate-600">—</span> },
        {
            key: '_act', label: '',
            render: r => {
                const isRecalcing = recalcLoading === r.id;
                const isThisMonth = r.period === currentPeriod();
                const canUpdate   = isThisMonth && r.status !== 'approved';
                return (
                    <div className="flex items-center gap-2 flex-wrap" onClick={e => e.stopPropagation()}>
                        {canUpdate && (
                            <button
                                onClick={e => handleRecalculate(e, r.id)}
                                disabled={isRecalcing}
                                className="flex items-center gap-1.5 rounded-lg border border-slate-600/50 bg-slate-700/30 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-700/60 disabled:opacity-50 transition"
                            >
                                <RefreshCw size={13} className={isRecalcing ? 'animate-spin' : ''} />
                                {isRecalcing ? '…' : 'Perbarui'}
                            </button>
                        )}
                        {r.status === 'draft' && (
                            <button
                                onClick={e => handleSubmit(e, r.id)}
                                disabled={isRecalcing}
                                className="flex items-center gap-1.5 rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-1.5 text-xs font-medium text-amber-300 hover:bg-amber-400/20 disabled:opacity-50 transition"
                            >
                                <Send size={13} /> Ajukan
                            </button>
                        )}
                        {r.status === 'rejected' && !isThisMonth && (
                            <button
                                onClick={e => handleRecalcThenSubmit(e, r.id)}
                                disabled={isRecalcing}
                                className="flex items-center gap-1.5 rounded-lg border border-sky-400/30 bg-sky-400/10 px-3 py-1.5 text-xs font-medium text-sky-300 hover:bg-sky-400/20 disabled:opacity-50 transition"
                            >
                                <RefreshCw size={13} className={isRecalcing ? 'animate-spin' : ''} />
                                {isRecalcing ? 'Memproses…' : 'Ajukan Ulang'}
                            </button>
                        )}
                        {r.status === 'approved' && (
                            <a
                                href={`/api/admin/transport-billings/${r.id}/download`}
                                target="_blank" rel="noreferrer"
                                onClick={e => e.stopPropagation()}
                                className="flex items-center gap-1.5 rounded-lg border border-slate-600/50 bg-slate-700/30 px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-700/60 transition"
                            >
                                <Download size={13} /> Unduh
                            </a>
                        )}
                    </div>
                );
            },
        },
    ];

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-semibold text-white">Rekap Tagihan</h1>
                <p className="mt-1 text-sm text-slate-500">Tagihan biaya pengiriman per periode — draft di sini, disetujui SuperAdmin.</p>
            </div>

            <SummaryCards summary={summary} loadingSummary={loadingSummary} />

            <PreviewCard period={currentPeriod()} onCreated={fetchList} />

            {/* Riwayat Tagihan */}
            <div className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                    <div>
                        <h2 className="text-sm font-semibold text-slate-300">Riwayat Tagihan</h2>
                        <p className="text-xs text-slate-600 mt-0.5">Klik baris untuk melihat rincian sopir</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <input
                            type="month" value={period}
                            onChange={e => { setPeriod(e.target.value); setPage(1); }}
                            className="rounded-xl border border-white/10 bg-slate-950/50 px-3 py-2 text-sm text-slate-300 outline-none focus:border-sky-400/30 transition"
                        />
                        {period && (
                            <button
                                onClick={() => { setPeriod(''); setPage(1); }}
                                className="rounded-xl border border-white/10 px-3 py-2 text-sm text-slate-500 hover:text-white transition"
                            >
                                Reset
                            </button>
                        )}
                    </div>
                </div>

                {error && (
                    <div className="rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-300">{error}</div>
                )}

                <Table
                    columns={columns}
                    data={data?.data}
                    loading={loading}
                    emptyMessage="Belum ada tagihan. Gunakan tombol di atas untuk membuat tagihan draft."
                    rowProps={row => ({
                        onClick: () => setSelectedId(row.id),
                        className: 'cursor-pointer',
                    })}
                />
                <Pagination meta={data} onPageChange={setPage} />
            </div>

            {selectedId && (
                <BillingDetailDrawer
                    billingId={selectedId}
                    onClose={() => setSelectedId(null)}
                />
            )}
        </div>
    );
}
