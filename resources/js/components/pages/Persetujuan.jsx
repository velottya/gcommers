import { CheckCircle, Coins, FileText, Package, Wallet, XCircle } from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';
import { api } from '../../api/client';
import { Pagination, Table } from '../ui/Table';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatRupiah(val) {
    if (val == null) return '—';
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);
}

function formatDate(val) {
    if (!val) return '—';
    return new Date(val).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
}

const STATUS_CFG = {
    submitted:           { label: 'Diajukan',          color: 'text-amber-300 bg-amber-400/10 border-amber-400/20' },
    approved:            { label: 'Disetujui',         color: 'text-emerald-300 bg-emerald-400/10 border-emerald-400/20' },
    partially_approved:  { label: 'Sebagian Disetujui', color: 'text-orange-300 bg-orange-400/10 border-orange-400/20' },
    rejected:            { label: 'Ditolak',           color: 'text-red-300 bg-red-400/10 border-red-400/20' },
    draft:               { label: 'Draft',             color: 'text-slate-400 bg-slate-400/10 border-slate-400/20' },
};

function StatusChip({ value }) {
    const cfg = STATUS_CFG[value] ?? STATUS_CFG.draft;
    return <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${cfg.color}`}>{cfg.label}</span>;
}

// ─── Review Modal (shared) ────────────────────────────────────────────────────

function ReviewModal({ title, summary, onClose, onApprove, onReject }) {
    const [action, setAction] = useState('approve');
    const [note,   setNote]   = useState('');
    const [saving, setSaving] = useState(false);
    const [error,  setError]  = useState(null);

    async function handleSubmit(e) {
        e.preventDefault();
        setSaving(true);
        setError(null);
        try {
            if (action === 'approve') {
                await onApprove(note);
            } else {
                await onReject(note);
            }
            onClose();
        } catch (err) {
            setError(err.message || 'Gagal memproses.');
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={onClose} />
            <div className="relative z-10 w-full max-w-md rounded-2xl border border-white/10 bg-slate-900 shadow-2xl">
                <div className="border-b border-white/8 px-6 py-4">
                    <h2 className="text-base font-semibold text-white">{title}</h2>
                </div>

                <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
                    <div className="rounded-xl border border-white/6 bg-white/3 px-4 py-3 text-sm text-slate-300">
                        {summary}
                    </div>

                    {error && (
                        <div className="rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-300">{error}</div>
                    )}

                    <div className="flex gap-2">
                        {[
                            { val: 'approve', label: 'Setujui', icon: CheckCircle, cls: 'border-emerald-400/30 bg-emerald-400/15 text-emerald-300' },
                            { val: 'reject',  label: 'Tolak',   icon: XCircle,     cls: 'border-red-400/30 bg-red-400/15 text-red-300' },
                        ].map(({ val, label, icon: Icon, cls }) => (
                            <button key={val} type="button" onClick={() => setAction(val)}
                                className={`flex flex-1 items-center justify-center gap-2 rounded-xl border py-2.5 text-sm font-medium transition
                                    ${action === val ? cls : 'border-white/10 text-slate-400 hover:text-slate-200'}`}>
                                <Icon size={15} /> {label}
                            </button>
                        ))}
                    </div>

                    <div className="space-y-1">
                        <label className="block text-xs font-medium text-slate-400">
                            Catatan {action === 'reject' ? '(sangat disarankan)' : '(opsional)'}
                        </label>
                        <textarea value={note} onChange={e => setNote(e.target.value)} rows={2}
                            className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white outline-none resize-none focus:border-amber-400/40 transition" />
                    </div>

                    <div className="flex justify-end gap-3">
                        <button type="button" onClick={onClose}
                            className="rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-400 hover:text-white transition">
                            Batal
                        </button>
                        <button type="submit" disabled={saving}
                            className={`rounded-xl px-5 py-2 text-sm font-semibold text-white disabled:opacity-50 transition
                                ${action === 'approve' ? 'bg-emerald-500 hover:bg-emerald-400' : 'bg-red-500 hover:bg-red-400'}`}>
                            {saving ? 'Memproses…' : action === 'approve' ? 'Setujui' : 'Tolak'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ─── Partial Review Modal (Quota Subsidi & Alokasi Biaya) ─────────────────────
//
// groups: [{ key, productName, productCode, lines: [{ id, label, detail }] }]

function PartialReviewModal({ title, groups, onClose, onSubmit }) {
    const [decisions, setDecisions] = useState(() => {
        const map = {};
        groups.forEach(g => g.lines.forEach(l => { map[l.id] = 'approved'; }));
        return map;
    });
    const [note,   setNote]   = useState('');
    const [saving, setSaving] = useState(false);
    const [error,  setError]  = useState(null);

    const allIds = groups.flatMap(g => g.lines.map(l => l.id));

    function setAll(value) {
        setDecisions(allIds.reduce((acc, id) => ({ ...acc, [id]: value }), {}));
    }

    function setGroup(group, value) {
        setDecisions(d => ({ ...d, ...group.lines.reduce((acc, l) => ({ ...acc, [l.id]: value }), {}) }));
    }

    function setLine(id, value) {
        setDecisions(d => ({ ...d, [id]: value }));
    }

    async function handleSubmit() {
        setSaving(true);
        setError(null);
        try {
            await onSubmit(allIds.map(id => ({ id, status: decisions[id] })), note);
            onClose();
        } catch (err) {
            setError(err.message || 'Gagal menyimpan keputusan.');
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={onClose} />
            <div className="relative z-10 w-full max-w-2xl rounded-2xl border border-white/10 bg-slate-900 shadow-2xl">
                <div className="flex items-center justify-between border-b border-white/8 px-6 py-4">
                    <h2 className="text-base font-semibold text-white">{title}</h2>
                    <div className="flex items-center gap-2">
                        <button type="button" onClick={() => setAll('approved')}
                            className="rounded-lg border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-1 text-xs text-emerald-300 hover:bg-emerald-400/20 transition">
                            Setujui Semua
                        </button>
                        <button type="button" onClick={() => setAll('rejected')}
                            className="rounded-lg border border-red-400/30 bg-red-400/10 px-2.5 py-1 text-xs text-red-300 hover:bg-red-400/20 transition">
                            Tolak Semua
                        </button>
                    </div>
                </div>

                <div className="max-h-[60vh] overflow-y-auto px-6 py-5 space-y-3">
                    {error && (
                        <div className="rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-300">{error}</div>
                    )}
                    {groups.map(g => (
                        <div key={g.key} className="rounded-xl border border-white/8 bg-white/3 overflow-hidden">
                            <div className="flex items-center justify-between px-3 py-2 border-b border-white/8">
                                <div>
                                    <p className="text-sm font-medium text-white">{g.productName}</p>
                                    <p className="text-xs text-slate-500 font-mono">{g.productCode}</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <button type="button" onClick={() => setGroup(g, 'approved')}
                                        className="text-xs text-emerald-300 hover:underline">Setujui produk ini</button>
                                    <button type="button" onClick={() => setGroup(g, 'rejected')}
                                        className="text-xs text-red-300 hover:underline">Tolak produk ini</button>
                                </div>
                            </div>
                            <div className="divide-y divide-white/5">
                                {g.lines.map(l => (
                                    <div key={l.id} className="flex items-center justify-between px-3 py-2 text-sm">
                                        <div>
                                            <p className="text-white">{l.label}</p>
                                            {l.detail && <p className="text-xs text-slate-500">{l.detail}</p>}
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <button type="button" onClick={() => setLine(l.id, 'approved')}
                                                className={`rounded-lg px-2.5 py-1 text-xs border transition ${decisions[l.id] === 'approved' ? 'border-emerald-400/40 bg-emerald-400/20 text-emerald-300' : 'border-white/10 text-slate-500 hover:text-white'}`}>
                                                Setuju
                                            </button>
                                            <button type="button" onClick={() => setLine(l.id, 'rejected')}
                                                className={`rounded-lg px-2.5 py-1 text-xs border transition ${decisions[l.id] === 'rejected' ? 'border-red-400/40 bg-red-400/20 text-red-300' : 'border-white/10 text-slate-500 hover:text-white'}`}>
                                                Tolak
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}

                    <div className="space-y-1 pt-1">
                        <label className="block text-xs font-medium text-slate-400">Catatan (opsional)</label>
                        <textarea value={note} onChange={e => setNote(e.target.value)} rows={2}
                            className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white outline-none resize-none focus:border-amber-400/40 transition" />
                    </div>
                </div>

                <div className="flex justify-end gap-3 border-t border-white/8 px-6 py-4">
                    <button type="button" onClick={onClose}
                        className="rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-400 hover:text-white transition">
                        Batal
                    </button>
                    <button type="button" onClick={handleSubmit} disabled={saving}
                        className="rounded-xl bg-amber-400 px-5 py-2 text-sm font-semibold text-slate-950 hover:bg-amber-300 disabled:opacity-50 transition">
                        {saving ? 'Menyimpan…' : 'Simpan Keputusan'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Tab: Alokasi Biaya ───────────────────────────────────────────────────────

function groupItemsByProduct(items) {
    const map = new Map();
    for (const it of (items ?? [])) {
        if (!map.has(it.product_id)) {
            map.set(it.product_id, { product_id: it.product_id, product_name: it.product_name, product_code: it.product_code, rates: [] });
        }
        map.get(it.product_id).rates.push(it);
    }
    return Array.from(map.values());
}

function TabAlokasibiaya() {
    const [data,          setData]          = useState(null);
    const [loading,       setLoading]       = useState(true);
    const [error,         setError]         = useState(null);
    const [page,          setPage]          = useState(1);
    const [status,        setStatus]        = useState('submitted');
    const [target,        setTarget]        = useState(null);
    const [targetDetail,  setTargetDetail]  = useState(null);
    const [detailLoading, setDetailLoading] = useState(false);

    const fetch = useCallback(() => {
        setLoading(true);
        api.get('/cost-rates', { page, ...(status ? { status } : {}) })
            .then(setData)
            .catch(e => setError(e.message))
            .finally(() => setLoading(false));
    }, [page, status]);

    useEffect(() => { fetch(); }, [fetch]);

    async function openReview(row) {
        setTarget(row);
        setDetailLoading(true);
        try {
            const detail = await api.get(`/cost-rates/${row.id}`);
            setTargetDetail(detail);
        } catch {
            setTargetDetail(null);
        } finally {
            setDetailLoading(false);
        }
    }

    function closeReview() { setTarget(null); setTargetDetail(null); fetch(); }

    const columns = [
        { key: 'region',       label: 'Region' },
        { key: 'pph_persen',   label: 'PPh %', render: r => <span className="font-mono text-white">{r.pph_persen}%</span> },
        { key: 'items_count',  label: 'Jumlah Tarif', render: r => <span className="text-xs font-mono">{r.items_count} tarif</span> },
        { key: 'submitted_by', label: 'Diajukan Oleh', render: r => <span className="text-xs text-slate-400">{r.submitted_by}</span> },
        { key: 'status',       label: 'Status', render: r => <StatusChip value={r.status} /> },
        { key: 'review_note',  label: 'Catatan', render: r => r.review_note ? <span className="text-xs text-slate-400 truncate max-w-[120px] block">{r.review_note}</span> : null },
        {
            key: '_act', label: '',
            render: r => r.status === 'submitted' ? (
                <button onClick={() => openReview(r)}
                    className="rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-1.5 text-xs text-amber-300 hover:bg-amber-400/20 transition">
                    Tinjau
                </button>
            ) : null,
        },
    ];

    const reviewGroups = targetDetail ? groupItemsByProduct(targetDetail.items).map(p => ({
        key:         p.product_id,
        productName: p.product_name,
        productCode: p.product_code,
        lines: p.rates.map(r => ({
            id:     r.id,
            label:  r.kecamatan,
            detail: `${formatRupiah(r.harga_satuan)}/kg · ongkir ${formatRupiah(r.biaya_pengiriman)}/kg`,
        })),
    })) : [];

    return (
        <div className="space-y-4">
            <div className="flex gap-3">
                <select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}
                    className="rounded-xl border border-white/10 bg-slate-950/50 px-3 py-2 text-sm text-slate-300 outline-none focus:border-amber-400/30 transition">
                    <option value="submitted">Menunggu Persetujuan</option>
                    <option value="approved">Disetujui</option>
                    <option value="rejected">Ditolak</option>
                    <option value="">Semua</option>
                </select>
            </div>

            {error && <div className="rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-300">{error}</div>}

            <Table columns={columns} data={data?.data} loading={loading} emptyMessage="Tidak ada ajuan tarif biaya." />
            <Pagination meta={data} onPageChange={setPage} />

            {target && detailLoading && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-400 border-t-transparent" />
                </div>
            )}
            {target && targetDetail && (
                <PartialReviewModal
                    title={`Tinjau Tarif Biaya — ${target.region}`}
                    groups={reviewGroups}
                    onClose={closeReview}
                    onSubmit={(decisions, note) => api.post(`/cost-rates/${target.id}/review`, { decisions, review_note: note })}
                />
            )}
        </div>
    );
}

// ─── Tab: Quota Subsidi ───────────────────────────────────────────────────────

function TabQuota() {
    const [data,          setData]          = useState(null);
    const [loading,       setLoading]       = useState(true);
    const [error,         setError]         = useState(null);
    const [page,          setPage]          = useState(1);
    const [status,        setStatus]        = useState('submitted');
    const [target,        setTarget]        = useState(null);
    const [targetDetail,  setTargetDetail]  = useState(null);
    const [detailLoading, setDetailLoading] = useState(false);

    const fetch = useCallback(() => {
        setLoading(true);
        api.get('/quota-subsidi', { page, ...(status ? { status } : {}) })
            .then(setData)
            .catch(e => setError(e.message))
            .finally(() => setLoading(false));
    }, [page, status]);

    useEffect(() => { fetch(); }, [fetch]);

    async function openReview(row) {
        setTarget(row);
        setDetailLoading(true);
        try {
            const detail = await api.get(`/quota-subsidi/${row.id}`);
            setTargetDetail(detail);
        } catch {
            setTargetDetail(null);
        } finally {
            setDetailLoading(false);
        }
    }

    function closeReview() { setTarget(null); setTargetDetail(null); fetch(); }

    function fTon(v) {
        return v == null ? '—' : `${Number(v).toLocaleString('id-ID', { maximumFractionDigits: 2 })} TON`;
    }

    const MONTHS_ID = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
    ];

    function formatPeriod(period) {
        if (!period) return '—';
        const [y, m] = period.split('-');
        return `${MONTHS_ID[parseInt(m, 10) - 1] ?? m} ${y}`;
    }

    const columns = [
        { key: 'region',         label: 'Region' },
        { key: 'period',         label: 'Periode', render: r => <span className="font-semibold text-white">{formatPeriod(r.period)}</span> },
        { key: 'products_count', label: 'Produk', render: r => <span className="text-xs font-mono">{r.products_count} produk</span> },
        { key: 'submitted_by',   label: 'Diajukan Oleh', render: r => <span className="text-xs text-slate-400">{r.submitted_by}</span> },
        { key: 'status',         label: 'Status', render: r => <StatusChip value={r.status} /> },
        { key: 'review_note',    label: 'Catatan', render: r => r.review_note ? <span className="text-xs text-slate-400 truncate max-w-[120px] block">{r.review_note}</span> : null },
        {
            key: '_act', label: '',
            render: r => r.status === 'submitted' ? (
                <button onClick={() => openReview(r)}
                    className="rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-1.5 text-xs text-amber-300 hover:bg-amber-400/20 transition">
                    Tinjau
                </button>
            ) : null,
        },
    ];

    const reviewGroups = targetDetail ? (targetDetail.products ?? []).map(p => ({
        key:         p.id,
        productName: p.product_name,
        productCode: p.product_code,
        lines: (p.kecamatan_allocations ?? []).map(k => ({
            id:     k.id,
            label:  k.kecamatan,
            detail: fTon(k.qty_ton),
        })),
    })) : [];

    return (
        <div className="space-y-4">
            <div className="flex gap-3">
                <select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}
                    className="rounded-xl border border-white/10 bg-slate-950/50 px-3 py-2 text-sm text-slate-300 outline-none focus:border-amber-400/30 transition">
                    <option value="submitted">Menunggu Persetujuan</option>
                    <option value="approved">Disetujui</option>
                    <option value="rejected">Ditolak</option>
                    <option value="">Semua</option>
                </select>
            </div>

            {error && <div className="rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-300">{error}</div>}

            <Table columns={columns} data={data?.data} loading={loading} emptyMessage="Tidak ada ajuan quota subsidi." />
            <Pagination meta={data} onPageChange={setPage} />

            {target && detailLoading && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-400 border-t-transparent" />
                </div>
            )}
            {target && targetDetail && (
                <PartialReviewModal
                    title={`Tinjau Quota Subsidi — ${target.region} ${formatPeriod(target.period)}`}
                    groups={reviewGroups}
                    onClose={closeReview}
                    onSubmit={(decisions, note) => api.post(`/quota-subsidi/${target.id}/review`, { decisions, review_note: note })}
                />
            )}
        </div>
    );
}

// ─── Tab: Tagihan Transport ───────────────────────────────────────────────────

function TabTagihan() {
    const [data,    setData]    = useState(null);
    const [loading, setLoading] = useState(true);
    const [error,   setError]   = useState(null);
    const [page,    setPage]    = useState(1);
    const [status,  setStatus]  = useState('submitted');
    const [target,  setTarget]  = useState(null);

    const fetch = useCallback(() => {
        setLoading(true);
        api.get('/transport-billings', { page, ...(status ? { status } : {}) })
            .then(setData)
            .catch(e => setError(e.message))
            .finally(() => setLoading(false));
    }, [page, status]);

    useEffect(() => { fetch(); }, [fetch]);

    const columns = [
        { key: 'company_name',   label: 'Perusahaan' },
        { key: 'period',         label: 'Periode' },
        { key: 'total_orders',   label: 'Jml Order' },
        { key: 'total_shipping', label: 'Ongkos Kirim',  render: r => formatRupiah(r.total_shipping) },
        { key: 'total_amount',   label: 'Total Nilai',   render: r => formatRupiah(r.total_amount) },
        { key: 'submitted_by',   label: 'Diajukan Oleh', render: r => <span className="text-xs text-slate-400">{r.submitted_by}</span> },
        { key: 'status',         label: 'Status',        render: r => <StatusChip value={r.status} /> },
        { key: 'reviewed_by',    label: 'Ditinjau',      render: r => r.reviewed_by ? <span className="text-xs text-slate-400">{r.reviewed_by}</span> : null },
        {
            key: '_act', label: '',
            render: r => r.status === 'submitted' ? (
                <button onClick={() => setTarget(r)}
                    className="rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-1.5 text-xs text-amber-300 hover:bg-amber-400/20 transition">
                    Tinjau
                </button>
            ) : null,
        },
    ];

    return (
        <div className="space-y-4">
            <div className="flex gap-3">
                <select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}
                    className="rounded-xl border border-white/10 bg-slate-950/50 px-3 py-2 text-sm text-slate-300 outline-none focus:border-amber-400/30 transition">
                    <option value="submitted">Menunggu Persetujuan</option>
                    <option value="approved">Disetujui</option>
                    <option value="rejected">Ditolak</option>
                    <option value="">Semua</option>
                </select>
            </div>

            {error && <div className="rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-300">{error}</div>}

            <Table columns={columns} data={data?.data} loading={loading} emptyMessage="Belum ada tagihan masuk." />
            <Pagination meta={data} onPageChange={setPage} />

            {target && (
                <ReviewModal
                    title="Tinjau Tagihan Biaya Transport"
                    summary={
                        <div className="space-y-1 text-xs">
                            <p><span className="text-slate-500">Perusahaan:</span> {target.company_name}</p>
                            <p><span className="text-slate-500">Periode:</span> {target.period}</p>
                            <p><span className="text-slate-500">Total Order:</span> {target.total_orders}</p>
                            <p><span className="text-slate-500">Ongkos Kirim:</span> <strong className="text-sky-300">{formatRupiah(target.total_shipping)}</strong></p>
                            <p><span className="text-slate-500">Total Nilai:</span> <strong className="text-amber-300">{formatRupiah(target.total_amount)}</strong></p>
                        </div>
                    }
                    onClose={() => { setTarget(null); fetch(); }}
                    onApprove={note => api.post(`/transport-billings/${target.id}/approve`, { note })}
                    onReject={note  => api.post(`/transport-billings/${target.id}/reject`,  { note })}
                />
            )}
        </div>
    );
}

// ─── Tab: Ajuan Stok ─────────────────────────────────────────────────────────

function hitungBiaya(r) {
    const subtotal   = Number(r.harga_satuan || 0) * Number(r.qty_requested || 0);
    const totalKirim = Number(r.biaya_pengiriman_per_kg || 0) * Number(r.qty_requested || 0) * 1000;
    const pphAmt     = subtotal * (Number(r.pajak_pph_persen || 0) / 100);
    const total      = subtotal + totalKirim + pphAmt;
    return { subtotal, totalKirim, pphAmt, total };
}

function TabAjuanStok() {
    const [data,    setData]    = useState(null);
    const [loading, setLoading] = useState(true);
    const [error,   setError]   = useState(null);
    const [page,    setPage]    = useState(1);
    const [status,  setStatus]  = useState('submitted');
    const [target,  setTarget]  = useState(null);

    const fetch = useCallback(() => {
        setLoading(true);
        api.get('/product-stock-requests', { page, ...(status ? { status } : {}) })
            .then(setData)
            .catch(e => setError(e.message))
            .finally(() => setLoading(false));
    }, [page, status]);

    useEffect(() => { fetch(); }, [fetch]);

    const columns = [
        {
            key: 'product_name',
            label: 'Produk',
            render: r => (
                <div>
                    <p className="font-medium text-white text-sm">{r.product_name}</p>
                    {r.product_code && <p className="text-xs text-slate-500 font-mono">{r.product_code}</p>}
                </div>
            ),
        },
        { key: 'region',          label: 'Region' },
        { key: 'requested_by',    label: 'Diajukan Oleh',  render: r => <span className="text-xs text-slate-400">{r.requested_by}</span> },
        { key: 'qty_requested',   label: 'Qty (TON)',       render: r => <span className="font-semibold text-amber-300">+{r.qty_requested}</span> },
        { key: 'harga_satuan',           label: 'Harga/TON',  render: r => r.harga_satuan           ? formatRupiah(r.harga_satuan)                           : <span className="text-slate-600 text-xs">—</span> },
        { key: 'biaya_pengiriman_per_kg',label: 'Ongkir/kg', render: r => r.biaya_pengiriman_per_kg ? <span>{formatRupiah(r.biaya_pengiriman_per_kg)}/kg</span> : <span className="text-slate-600 text-xs">—</span> },
        { key: 'created_at',      label: 'Tgl Ajuan',       render: r => <span className="text-xs text-slate-400">{formatDate(r.created_at)}</span> },
        { key: 'status',          label: 'Status',           render: r => <StatusChip value={r.status} /> },
        {
            key: '_act', label: '',
            render: r => r.status === 'submitted' ? (
                <button onClick={() => setTarget(r)}
                    className="rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-1.5 text-xs text-amber-300 hover:bg-amber-400/20 transition">
                    Tinjau
                </button>
            ) : null,
        },
    ];

    const targetBiaya = target ? hitungBiaya(target) : null;

    return (
        <div className="space-y-4">
            <div className="flex gap-3">
                <select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}
                    className="rounded-xl border border-white/10 bg-slate-950/50 px-3 py-2 text-sm text-slate-300 outline-none focus:border-amber-400/30 transition">
                    <option value="submitted">Menunggu Persetujuan</option>
                    <option value="approved">Disetujui</option>
                    <option value="rejected">Ditolak</option>
                    <option value="">Semua</option>
                </select>
            </div>

            {error && <div className="rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-300">{error}</div>}

            <Table columns={columns} data={data?.data} loading={loading} emptyMessage="Belum ada ajuan stok masuk." />
            <Pagination meta={data} onPageChange={setPage} />

            {target && (
                <ReviewModal
                    title="Tinjau Ajuan Tambah Stok"
                    summary={
                        <div className="space-y-2 text-xs">
                            {/* Info produk */}
                            <div className="space-y-1">
                                <p><span className="text-slate-500">Produk:</span> <strong className="text-white">{target.product_name}</strong>{target.product_code && <span className="ml-1 font-mono text-slate-500">({target.product_code})</span>}</p>
                                <p><span className="text-slate-500">Region:</span> {target.region}</p>
                                <p><span className="text-slate-500">Diajukan oleh:</span> {target.requested_by}</p>
                                <p><span className="text-slate-500">Jumlah stok:</span> <strong className="text-amber-300">+{target.qty_requested} TON</strong></p>
                                {target.notes && <p><span className="text-slate-500">Keterangan:</span> {target.notes}</p>}
                            </div>

                            {/* Rincian harga */}
                            {target.harga_satuan && (
                                <div className="border-t border-white/8 pt-2 space-y-1">
                                    <p className="text-slate-500 font-medium mb-1">Rincian Harga</p>
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">Harga satuan</span>
                                        <span>{formatRupiah(target.harga_satuan)}/TON</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">Subtotal ({target.qty_requested} TON)</span>
                                        <span>{formatRupiah(targetBiaya.subtotal)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">
                                            Ongkir ({target.qty_requested} TON = {(target.qty_requested * 1000).toLocaleString('id-ID')} kg × {formatRupiah(target.biaya_pengiriman_per_kg)}/kg)
                                        </span>
                                        <span>{formatRupiah(targetBiaya.totalKirim)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">PPH ({target.pajak_pph_persen}%)</span>
                                        <span>{formatRupiah(targetBiaya.pphAmt)}</span>
                                    </div>
                                    <div className="flex justify-between border-t border-white/8 pt-1 font-semibold text-amber-300">
                                        <span>Total Estimasi</span>
                                        <span>{formatRupiah(targetBiaya.total)}</span>
                                    </div>
                                </div>
                            )}

                            <p className="text-slate-600 italic border-t border-white/8 pt-2">
                                Jika disetujui: stok region +{target.qty_requested} TON, harga & ongkir region diperbarui.
                            </p>
                        </div>
                    }
                    onClose={() => { setTarget(null); fetch(); }}
                    onApprove={note => api.post(`/product-stock-requests/${target.id}/approve`, { review_note: note })}
                    onReject={note  => api.post(`/product-stock-requests/${target.id}/reject`,  { review_note: note })}
                />
            )}
        </div>
    );
}

// ─── Main page ────────────────────────────────────────────────────────────────

const TABS = [
    { key: 'biaya',   label: 'Alokasi Biaya',    icon: Wallet },
    { key: 'quota',   label: 'Quota Subsidi',     icon: Coins },
    { key: 'tagihan', label: 'Tagihan Transport', icon: FileText },
    { key: 'stok',    label: 'Ajuan Stok',        icon: Package },
];

export default function Persetujuan() {
    const [tab, setTab] = useState('biaya');

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-semibold text-white">Persetujuan Ajuan</h1>
                <p className="mt-1 text-sm text-slate-500">
                    Tinjau dan setujui ajuan alokasi biaya, quota subsidi, tagihan transportir, dan ajuan stok produk.
                </p>
            </div>

            {/* Tab bar */}
            <div className="flex flex-wrap gap-1 rounded-xl border border-white/8 bg-white/3 p-1 w-fit">
                {TABS.map(({ key, label, icon: Icon }) => (
                    <button key={key} onClick={() => setTab(key)}
                        className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition
                            ${tab === key ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-slate-300'}`}>
                        <Icon size={15} />
                        {label}
                    </button>
                ))}
            </div>

            {tab === 'biaya'   && <TabAlokasibiaya />}
            {tab === 'quota'   && <TabQuota />}
            {tab === 'tagihan' && <TabTagihan />}
            {tab === 'stok'    && <TabAjuanStok />}
        </div>
    );
}
