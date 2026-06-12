import { Calculator, Send, X } from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';
import { api } from '../../api/client';
import StatusBadge from '../ui/StatusBadge';
import { Pagination, Table } from '../ui/Table';

function formatRupiah(val) {
    if (val == null) return '—';
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);
}

function formatDate(val) {
    if (!val) return '—';
    return new Date(val).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

const ALLOC_STATUS = {
    draft:     { label: 'Draft',     color: 'text-slate-400 bg-slate-400/10 border-slate-400/20' },
    submitted: { label: 'Diajukan', color: 'text-amber-300 bg-amber-400/10 border-amber-400/20' },
    approved:  { label: 'Disetujui', color: 'text-emerald-300 bg-emerald-400/10 border-emerald-400/20' },
    rejected:  { label: 'Ditolak',  color: 'text-red-300 bg-red-400/10 border-red-400/20' },
};

function AllocStatusChip({ value }) {
    if (!value) return <span className="text-xs text-slate-600 italic">Belum dialokasi</span>;
    const cfg = ALLOC_STATUS[value] ?? ALLOC_STATUS.draft;
    return (
        <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${cfg.color}`}>
            {cfg.label}
        </span>
    );
}

function Field({ label, children, hint }) {
    return (
        <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-400">{label}</label>
            {children}
            {hint && <p className="text-xs text-slate-600">{hint}</p>}
        </div>
    );
}

function Inp({ ...props }) {
    return (
        <input
            className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white outline-none transition focus:border-teal-400/40"
            {...props}
        />
    );
}

function AllokasiModal({ order, defaults, existing, onClose, onSaved }) {
    const [form,   setForm]   = useState({
        shipping_cost: existing?.shipping_cost ?? defaults?.biaya_pengiriman_dasar ?? '',
        pph_amount:    existing?.pph_amount    ?? '',
        ppn_amount:    existing?.ppn_amount    ?? '',
        notes:         existing?.notes         ?? '',
    });
    const [saving, setSaving] = useState(false);
    const [error,  setError]  = useState(null);

    const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

    const total = (parseFloat(form.shipping_cost) || 0)
        + (parseFloat(form.pph_amount) || 0)
        + (parseFloat(form.ppn_amount) || 0);

    async function handleSave(submitAfter = false) {
        setSaving(true);
        setError(null);
        try {
            const saved = await api.post('/order-cost-allocations', {
                order_id: order.id,
                ...form,
            });
            if (submitAfter) {
                await api.post(`/order-cost-allocations/${saved.id}/submit`);
            }
            onSaved();
            onClose();
        } catch (err) {
            setError(err.message || 'Gagal menyimpan.');
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={onClose} />
            <div className="relative z-10 w-full max-w-lg rounded-2xl border border-white/10 bg-slate-900 shadow-2xl">
                <div className="flex items-center justify-between border-b border-white/8 px-6 py-4">
                    <h2 className="flex items-center gap-2 text-base font-semibold text-white">
                        <Calculator size={16} className="text-teal-400" />
                        Alokasi Biaya Pesanan
                    </h2>
                    <button onClick={onClose} className="rounded-lg p-1 text-slate-500 hover:text-white transition"><X size={18} /></button>
                </div>

                <div className="px-6 py-5 space-y-4">
                    <div className="rounded-xl border border-white/6 bg-white/3 p-3 text-sm">
                        <p className="font-mono text-white">{order.poNumber}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{order.userEmail}</p>
                        <p className="text-xs text-slate-500 mt-0.5">
                            Subtotal: {formatRupiah(order.subTotal)} &nbsp;|&nbsp;
                            Ongkir sistem: {formatRupiah(order.shippingAmount)}
                        </p>
                    </div>

                    {error && (
                        <div className="rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-300">{error}</div>
                    )}

                    <div className="grid grid-cols-3 gap-3">
                        <Field label="Biaya Pengiriman (Rp)">
                            <Inp type="number" min="0" step="1" value={form.shipping_cost} onChange={set('shipping_cost')}
                                placeholder="0" />
                        </Field>
                        <Field label="PPH (Rp)">
                            <Inp type="number" min="0" step="1" value={form.pph_amount} onChange={set('pph_amount')}
                                placeholder="0" />
                        </Field>
                        <Field label="PPN (Rp)">
                            <Inp type="number" min="0" step="1" value={form.ppn_amount} onChange={set('ppn_amount')}
                                placeholder="0" />
                        </Field>
                    </div>

                    <div className="flex items-center justify-between rounded-xl border border-teal-400/15 bg-teal-400/5 px-4 py-3">
                        <span className="text-sm text-slate-400">Total Alokasi</span>
                        <span className="text-base font-semibold text-teal-300">{formatRupiah(total)}</span>
                    </div>

                    <Field label="Catatan (opsional)">
                        <textarea
                            value={form.notes}
                            onChange={set('notes')}
                            rows={2}
                            placeholder="Keterangan tambahan..."
                            className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white outline-none resize-none focus:border-teal-400/40 transition"
                        />
                    </Field>

                    {defaults && (
                        <p className="text-xs text-slate-600">
                            Tarif referensi: Pengiriman Rp{defaults.biaya_pengiriman_dasar?.toLocaleString('id-ID')},
                            PPH {defaults.pph_persen}%, PPN {defaults.ppn_persen}%
                        </p>
                    )}
                </div>

                <div className="flex justify-end gap-3 border-t border-white/8 px-6 py-4">
                    <button type="button" onClick={onClose}
                        className="rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-400 hover:text-white transition">
                        Batal
                    </button>
                    <button onClick={() => handleSave(false)} disabled={saving}
                        className="rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-300 hover:text-white disabled:opacity-50 transition">
                        {saving ? 'Menyimpan…' : 'Simpan Draft'}
                    </button>
                    <button onClick={() => handleSave(true)} disabled={saving}
                        className="flex items-center gap-1.5 rounded-xl bg-teal-500 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-400 disabled:opacity-50 transition">
                        <Send size={14} />
                        {saving ? 'Mengajukan…' : 'Ajukan ke SuperAdmin'}
                    </button>
                </div>
            </div>
        </div>
    );
}

const STATUS_OPTIONS = ['', 'pending', 'processing', 'on_delivery', 'delivered', 'cancelled'];

export default function AlokasiOrderBiaya({ user }) {
    const [orders,      setOrders]      = useState(null);
    const [allocMap,    setAllocMap]    = useState({});
    const [defaults,    setDefaults]    = useState(null);
    const [loading,     setLoading]     = useState(true);
    const [error,       setError]       = useState(null);
    const [page,        setPage]        = useState(1);
    const [search,      setSearch]      = useState('');
    const [status,      setStatus]      = useState('');
    const [query,       setQuery]       = useState({});
    const [allocTarget, setAllocTarget] = useState(null);

    // Load reference fees once
    useEffect(() => {
        api.get('/settings/fees-view').then(setDefaults).catch(() => {});
    }, []);

    const fetchOrders = useCallback(() => {
        setLoading(true);
        api.get('/orders', { page, ...query })
            .then(data => {
                setOrders(data);
                // Fetch allocation status for visible orders
                const ids = (data?.data ?? []).map(o => o.id).filter(Boolean);
                if (ids.length) {
                    api.get('/order-cost-allocations', { per_page: ids.length + 5 })
                        .then(d => {
                            const map = {};
                            (d?.data ?? []).forEach(a => { map[a.order_id] = a; });
                            setAllocMap(map);
                        })
                        .catch(() => {});
                }
            })
            .catch(e => setError(e.message))
            .finally(() => setLoading(false));
    }, [page, query]);

    useEffect(() => { fetchOrders(); }, [fetchOrders]);

    function handleSearch(e) {
        e.preventDefault();
        setPage(1);
        setQuery({ search, status });
    }

    async function handleSubmitDraft(allocId) {
        try {
            await api.post(`/order-cost-allocations/${allocId}/submit`);
            fetchOrders();
        } catch (err) {
            alert(err.message || 'Gagal mengajukan.');
        }
    }

    const columns = [
        { key: 'poNumber',    label: 'PO Number',    render: r => <span className="font-mono text-xs">{r.poNumber}</span> },
        { key: 'userEmail',   label: 'Kiosk',        render: r => <span className="text-xs truncate">{r.userEmail}</span> },
        { key: 'status',      label: 'Status Order', render: r => <StatusBadge value={r.status} /> },
        { key: 'totalAmount', label: 'Nilai Order',  render: r => formatRupiah(r.totalAmount) },
        { key: 'createdAt',   label: 'Tanggal',      render: r => formatDate(r.createdAt) },
        {
            key: 'allocStatus', label: 'Status Alokasi',
            render: r => {
                const alloc = allocMap[r.id];
                return <AllocStatusChip value={alloc?.status} />;
            },
        },
        {
            key: '_act', label: '',
            render: r => {
                const alloc = allocMap[r.id];
                if (alloc?.status === 'submitted' || alloc?.status === 'approved') {
                    return (
                        <button onClick={() => setAllocTarget({ ...r, _alloc: alloc })}
                            className="text-xs text-slate-500 hover:text-teal-300 transition">
                            Lihat →
                        </button>
                    );
                }
                return (
                    <div className="flex items-center gap-2">
                        <button onClick={() => setAllocTarget({ ...r, _alloc: alloc })}
                            className="rounded-lg border border-teal-400/30 bg-teal-400/10 px-3 py-1.5 text-xs font-medium text-teal-300 hover:bg-teal-400/20 transition">
                            {alloc ? 'Edit' : 'Alokasi'}
                        </button>
                        {alloc?.status === 'draft' && (
                            <button onClick={() => handleSubmitDraft(alloc.id)}
                                className="flex items-center gap-1 rounded-lg border border-amber-400/30 bg-amber-400/10 px-2.5 py-1.5 text-xs text-amber-300 hover:bg-amber-400/20 transition">
                                <Send size={12} /> Ajukan
                            </button>
                        )}
                    </div>
                );
            },
        },
    ];

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-semibold text-white">Alokasi Biaya Pengiriman</h1>
                <p className="mt-1 text-sm text-slate-500">
                    Tentukan biaya pengiriman, PPH, dan PPN untuk setiap pesanan, lalu ajukan ke SuperAdmin.
                </p>
            </div>

            <form onSubmit={handleSearch} className="flex flex-wrap gap-3">
                <div className="relative flex-1 min-w-[200px]">
                    <input type="text" placeholder="Cari PO number atau email…"
                        value={search} onChange={e => setSearch(e.target.value)}
                        className="w-full rounded-xl border border-white/10 bg-slate-950/50 px-4 py-2.5 text-sm text-white placeholder-slate-600 outline-none focus:border-teal-400/30 transition" />
                </div>
                <select value={status} onChange={e => setStatus(e.target.value)}
                    className="rounded-xl border border-white/10 bg-slate-950/50 px-3 py-2.5 text-sm text-slate-300 outline-none focus:border-teal-400/30 transition">
                    {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s || 'Semua status'}</option>)}
                </select>
                <button type="submit"
                    className="rounded-xl bg-teal-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-400 transition">
                    Cari
                </button>
            </form>

            {error && (
                <div className="rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-300">{error}</div>
            )}

            <Table
                columns={columns}
                data={orders?.data}
                loading={loading}
                emptyMessage="Tidak ada pesanan."
            />
            <Pagination meta={orders} onPageChange={setPage} />

            {allocTarget && (
                <AllokasiModal
                    order={allocTarget}
                    defaults={defaults}
                    existing={allocTarget._alloc}
                    onClose={() => setAllocTarget(null)}
                    onSaved={fetchOrders}
                />
            )}
        </div>
    );
}
