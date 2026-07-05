import { CheckCircle, Coins, Download, FileText, Truck, User, Wallet, Warehouse, X, XCircle } from 'lucide-react';
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
    pending:             { label: 'Menunggu Persetujuan', color: 'text-amber-300 bg-amber-400/10 border-amber-400/20' },
    approved:            { label: 'Disetujui',         color: 'text-emerald-300 bg-emerald-400/10 border-emerald-400/20' },
    partially_approved:  { label: 'Sebagian Disetujui', color: 'text-orange-300 bg-orange-400/10 border-orange-400/20' },
    rejected:            { label: 'Ditolak',           color: 'text-red-300 bg-red-400/10 border-red-400/20' },
    draft:               { label: 'Draft',             color: 'text-slate-400 bg-slate-400/10 border-slate-400/20' },
};

function StatusChip({ value }) {
    const cfg = STATUS_CFG[value] ?? STATUS_CFG.draft;
    return <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${cfg.color}`}>{cfg.label}</span>;
}

function SubmitterCell({ name, email }) {
    const showEmail = name && email && name !== email;
    return (
        <div>
            <p className="text-sm text-white truncate max-w-[200px]">{name || email || '—'}</p>
            {showEmail && <p className="text-xs text-slate-500 truncate max-w-[200px]">{email}</p>}
        </div>
    );
}

// ─── Review Modal (shared) ────────────────────────────────────────────────────

function ReviewModal({ title, summary, onClose, onApprove, onReject, readOnly = false }) {
    const [action, setAction] = useState('approve');
    const [note,   setNote]   = useState('');
    const [saving, setSaving] = useState(false);
    const [error,  setError]  = useState(null);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={onClose} />
            <div className="relative z-10 w-full max-w-md rounded-2xl border border-white/10 bg-slate-900 shadow-2xl">
                <div className="border-b border-white/8 px-6 py-4">
                    <h2 className="text-base font-semibold text-white">{title}</h2>
                </div>

                <div className="px-6 py-5 space-y-4">
                    <div className="rounded-xl border border-white/6 bg-white/3 px-4 py-3 text-sm text-slate-300">
                        {summary}
                    </div>

                    {!readOnly && (
                        <>
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
                        </>
                    )}

                    <div className="flex justify-end gap-3">
                        <button type="button" onClick={onClose}
                            className="rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-400 hover:text-white transition">
                            Tutup
                        </button>
                        {!readOnly && (
                            <button
                                onClick={async (e) => { e.preventDefault(); setSaving(true); setError(null); try { if (action === 'approve') await onApprove(note); else await onReject(note); onClose(); } catch(err) { setError(err.message || 'Gagal memproses.'); } finally { setSaving(false); } }}
                                disabled={saving}
                                className={`rounded-xl px-5 py-2 text-sm font-semibold text-white disabled:opacity-50 transition
                                    ${action === 'approve' ? 'bg-emerald-500 hover:bg-emerald-400' : 'bg-red-500 hover:bg-red-400'}`}>
                                {saving ? 'Memproses…' : action === 'approve' ? 'Setujui' : 'Tolak'}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── Partial Review Modal (Quota Subsidi & Alokasi Biaya) ─────────────────────
//
// groups: [{ key, productName, productCode, lines: [{ id, label, detail }] }]

function PartialReviewModal({ title, groups, onClose, onSubmit, readOnly = false }) {
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
                    {!readOnly && (
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
                    )}
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
                                {!readOnly && (
                                    <div className="flex items-center gap-3">
                                        <button type="button" onClick={() => setGroup(g, 'approved')}
                                            className="text-xs text-emerald-300 hover:underline">Setujui semua baris ini</button>
                                        <button type="button" onClick={() => setGroup(g, 'rejected')}
                                            className="text-xs text-red-300 hover:underline">Tolak semua baris ini</button>
                                    </div>
                                )}
                            </div>
                            <div className="divide-y divide-white/5">
                                {g.lines.map(l => (
                                    <div key={l.id} className="flex items-center justify-between px-3 py-2 text-sm">
                                        <div>
                                            <p className="text-white">{l.label}</p>
                                            {l.detail && <p className="text-xs text-slate-500">{l.detail}</p>}
                                        </div>
                                        {readOnly ? (
                                            l.status
                                                ? <StatusChip value={l.status} />
                                                : <span className="text-xs text-slate-600">—</span>
                                        ) : (
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
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}

                    {!readOnly && (
                        <div className="space-y-1 pt-1">
                            <label className="block text-xs font-medium text-slate-400">Catatan (opsional)</label>
                            <textarea value={note} onChange={e => setNote(e.target.value)} rows={2}
                                className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white outline-none resize-none focus:border-amber-400/40 transition" />
                        </div>
                    )}
                </div>

                <div className="flex justify-end gap-3 border-t border-white/8 px-6 py-4">
                    <button type="button" onClick={onClose}
                        className="rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-400 hover:text-white transition">
                        {readOnly ? 'Tutup' : 'Batal'}
                    </button>
                    {!readOnly && (
                        <button type="button" onClick={handleSubmit} disabled={saving}
                            className="rounded-xl bg-amber-400 px-5 py-2 text-sm font-semibold text-slate-950 hover:bg-amber-300 disabled:opacity-50 transition">
                            {saving ? 'Menyimpan…' : 'Simpan Keputusan'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

// ─── Tab: Harga Produk ────────────────────────────────────────────────────────

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

function TabHargaProduk() {
    const [data,          setData]          = useState(null);
    const [loading,       setLoading]       = useState(true);
    const [error,         setError]         = useState(null);
    const [page,          setPage]          = useState(1);
    const [status,        setStatus]        = useState('');
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
        {
            key: 'region', label: 'Region',
            render: r => <span className="font-medium text-teal-300">{r.region}</span>,
        },
        {
            key: 'cakupan', label: 'Cakupan',
            render: r => (
                <div>
                    <p className="text-sm text-white">{r.products_count ?? 0} produk</p>
                    <p className="text-xs text-slate-500">{r.items_count ?? 0} tarif kecamatan</p>
                </div>
            ),
        },
        {
            key: 'submitted_by', label: 'Diajukan Oleh',
            render: r => <SubmitterCell name={r.submitted_by_name} email={r.submitted_by} />,
        },
        {
            key: 'created_at', label: 'Diajukan',
            render: r => <span className="text-xs text-slate-400">{formatDate(r.created_at)}</span>,
        },
        { key: 'status', label: 'Status', render: r => <StatusChip value={r.status} /> },
        {
            key: 'review_note', label: 'Catatan',
            render: r => r.review_note
                ? <span className="text-xs text-slate-400 truncate max-w-[140px] block" title={r.review_note}>{r.review_note}</span>
                : null,
        },
    ];

    const reviewGroups = targetDetail ? groupItemsByProduct(targetDetail.items).map(g => ({
        key:         g.product_id,
        productName: g.product_name,
        productCode: g.product_code,
        lines: g.rates.map(r => ({
            id:     r.id,
            label:  r.kecamatan,
            detail: `Harga satuan: ${formatRupiah(r.harga_satuan)}`,
            status: r.status,
        })),
    })) : [];

    return (
        <div className="space-y-4">
            <div className="flex gap-3">
                <select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}
                    className="rounded-xl border border-white/10 bg-slate-950/50 px-3 py-2 text-sm text-slate-300 outline-none focus:border-amber-400/30 transition">
                    <option value="">Semua</option>
                    <option value="submitted">Menunggu Persetujuan</option>
                    <option value="approved">Disetujui</option>
                    <option value="rejected">Ditolak</option>
                </select>
            </div>

            {error && <div className="rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-300">{error}</div>}

            <Table
                columns={columns}
                data={data?.data}
                loading={loading}
                emptyMessage="Tidak ada ajuan harga produk."
                rowProps={row => ({ onClick: () => openReview(row), className: 'cursor-pointer' })}
            />
            <Pagination meta={data} onPageChange={setPage} />

            {target && detailLoading && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-400 border-t-transparent" />
                </div>
            )}
            {target && targetDetail && (
                <PartialReviewModal
                    title={`Rincian Harga Produk — ${target.region}`}
                    groups={reviewGroups}
                    readOnly={target.status !== 'submitted'}
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
    const [status,        setStatus]        = useState('');
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

    function formatPeriod(period) {
        return period || '—';
    }

    const columns = [
        {
            key: 'region', label: 'Region',
            render: r => <span className="font-medium text-teal-300">{r.region}</span>,
        },
        {
            key: 'period', label: 'Tahun',
            render: r => <span className="font-semibold text-white">{formatPeriod(r.period)}</span>,
        },
        {
            key: 'cakupan', label: 'Cakupan',
            render: r => (
                <div>
                    <p className="text-sm text-white">{r.products_count ?? 0} produk</p>
                    <p className="text-xs text-slate-500">{r.kecamatan_count ?? 0} kecamatan</p>
                </div>
            ),
        },
        {
            key: 'submitted_by', label: 'Diajukan Oleh',
            render: r => <SubmitterCell name={r.submitted_by_name} email={r.submitted_by} />,
        },
        {
            key: 'created_at', label: 'Diajukan',
            render: r => <span className="text-xs text-slate-400">{formatDate(r.created_at)}</span>,
        },
        { key: 'status', label: 'Status', render: r => <StatusChip value={r.status} /> },
        {
            key: 'review_note', label: 'Catatan',
            render: r => r.review_note
                ? <span className="text-xs text-slate-400 truncate max-w-[140px] block" title={r.review_note}>{r.review_note}</span>
                : null,
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
            status: k.status,
        })),
    })) : [];

    return (
        <div className="space-y-4">
            <div className="flex gap-3">
                <select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}
                    className="rounded-xl border border-white/10 bg-slate-950/50 px-3 py-2 text-sm text-slate-300 outline-none focus:border-amber-400/30 transition">
                    <option value="">Semua</option>
                    <option value="submitted">Menunggu Persetujuan</option>
                    <option value="approved">Disetujui</option>
                    <option value="rejected">Ditolak</option>
                </select>
            </div>

            {error && <div className="rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-300">{error}</div>}

            <Table
                columns={columns}
                data={data?.data}
                loading={loading}
                emptyMessage="Tidak ada ajuan quota subsidi."
                rowProps={row => ({ onClick: () => openReview(row), className: 'cursor-pointer' })}
            />
            <Pagination meta={data} onPageChange={setPage} />

            {target && detailLoading && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-400 border-t-transparent" />
                </div>
            )}
            {target && targetDetail && (
                <PartialReviewModal
                    title={`Rincian Quota Subsidi — ${target.region} ${formatPeriod(target.period)}`}
                    groups={reviewGroups}
                    readOnly={target.status !== 'submitted'}
                    onClose={closeReview}
                    onSubmit={(decisions, note) => api.post(`/quota-subsidi/${target.id}/review`, { decisions, review_note: note })}
                />
            )}
        </div>
    );
}

// ─── Tab: Tagihan Transport ───────────────────────────────────────────────────

const BILLING_STATUS_CFG = {
    draft:     { label: 'Draft',      color: 'text-slate-300 bg-slate-400/10 border-slate-400/20' },
    submitted: { label: 'Diajukan',   color: 'text-amber-300 bg-amber-400/10 border-amber-400/20' },
    approved:  { label: 'Disetujui',  color: 'text-emerald-300 bg-emerald-400/10 border-emerald-400/20' },
    rejected:  { label: 'Ditolak',    color: 'text-red-300 bg-red-400/10 border-red-400/20' },
};

function BillingStatusChip({ value }) {
    const cfg = BILLING_STATUS_CFG[value] ?? BILLING_STATUS_CFG.draft;
    return <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${cfg.color}`}>{cfg.label}</span>;
}

function BillingDetailModal({ billingId, onClose, onRefresh }) {
    const [detail,      setDetail]      = useState(null);
    const [loading,     setLoading]     = useState(true);
    const [error,       setError]       = useState(null);
    const [action,      setAction]      = useState('approve');
    const [note,        setNote]        = useState('');
    const [saving,      setSaving]      = useState(false);
    const [saveError,   setSaveError]   = useState(null);

    useEffect(() => {
        if (!billingId) return;
        setLoading(true);
        setError(null);
        api.get(`/transport-billings/${billingId}`)
            .then(setDetail)
            .catch(e => setError(e.message || 'Gagal memuat detail tagihan.'))
            .finally(() => setLoading(false));
    }, [billingId]);

    useEffect(() => {
        function onKey(e) { if (e.key === 'Escape') onClose(); }
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [onClose]);

    async function handleReview() {
        setSaving(true);
        setSaveError(null);
        try {
            if (action === 'approve') {
                await api.post(`/transport-billings/${billing.id}/approve`, { note });
            } else {
                await api.post(`/transport-billings/${billing.id}/reject`, { note });
            }
            onRefresh?.();
            onClose();
        } catch (err) {
            setSaveError(err.message || 'Gagal memproses.');
        } finally {
            setSaving(false);
        }
    }

    const billing     = detail?.billing;
    const driverRows  = detail?.driver_rows ?? [];
    const periodLabel = detail?.period_label ?? '';

    const noteStyle = billing ? {
        approved:  'bg-emerald-400/8 border-emerald-400/20 text-emerald-300',
        rejected:  'bg-red-400/8 border-red-400/20 text-red-300',
        submitted: 'bg-amber-400/8 border-amber-400/20 text-amber-300',
        draft:     'bg-slate-400/8 border-slate-400/20 text-slate-400',
    }[billing.status] : '';

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
            onClick={e => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div
                className="relative flex w-full max-w-2xl max-h-[90vh] flex-col bg-[#0d1117] border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
                style={{ animation: 'fadeScaleIn 0.18s ease-out' }}
            >
                {/* Header */}
                <div className="flex items-start justify-between gap-4 border-b border-white/8 px-6 py-4 shrink-0">
                    <div>
                        {billing ? (
                            <>
                                <div className="flex items-center gap-2.5">
                                    <span className="text-xs font-mono text-slate-500">TAG-{String(billing.id).padStart(5, '0')}</span>
                                    <BillingStatusChip value={billing.status} />
                                </div>
                                <h2 className="mt-1 text-lg font-semibold text-white">Tagihan {periodLabel}</h2>
                                <p className="text-xs text-slate-500 mt-0.5">{billing.company_name}</p>
                            </>
                        ) : (
                            <div className="h-6 w-48 animate-pulse rounded bg-white/5" />
                        )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        {billing?.status === 'approved' && (
                            <a
                                href={`/api/admin/transport-billings/${billingId}/download`}
                                target="_blank" rel="noreferrer"
                                className="flex items-center gap-1.5 rounded-lg border border-sky-400/30 bg-sky-400/10 px-3 py-1.5 text-xs font-medium text-sky-300 hover:bg-sky-400/20 transition"
                            >
                                <Download size={13} /> Unduh PDF
                            </a>
                        )}
                        <button onClick={onClose} className="rounded-lg p-1.5 text-slate-500 hover:text-white hover:bg-white/5 transition">
                            <X size={18} />
                        </button>
                    </div>
                </div>

                {/* Scrollable body */}
                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
                    {loading && (
                        <div className="space-y-3">
                            {[1,2,3,4].map(i => <div key={i} className="h-14 animate-pulse rounded-xl bg-white/5" />)}
                        </div>
                    )}
                    {error && (
                        <div className="rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-300">{error}</div>
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

                            {billing.note && (
                                <div className={`rounded-xl border px-4 py-3 text-sm ${noteStyle}`}>
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
                                                            {d.police_number && <span className="font-mono">&middot; {d.police_number}</span>}
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

                            {/* Inline review form — only for submitted */}
                            {billing.status === 'submitted' && (
                                <div className="rounded-xl border border-white/8 bg-white/3 p-5 space-y-4">
                                    <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-400">Keputusan</p>

                                    <div className="flex gap-2">
                                        {[
                                            { val: 'approve', label: 'Setujui', cls: action === 'approve' ? 'border-emerald-400/40 bg-emerald-400/15 text-emerald-300' : 'border-white/10 text-slate-400 hover:text-slate-200' },
                                            { val: 'reject',  label: 'Tolak',   cls: action === 'reject'  ? 'border-red-400/40 bg-red-400/15 text-red-300'             : 'border-white/10 text-slate-400 hover:text-slate-200' },
                                        ].map(({ val, label, cls }) => (
                                            <button key={val} type="button" onClick={() => setAction(val)}
                                                className={`flex flex-1 items-center justify-center gap-2 rounded-xl border py-2.5 text-sm font-medium transition ${cls}`}>
                                                {val === 'approve' ? <CheckCircle size={15} /> : <XCircle size={15} />} {label}
                                            </button>
                                        ))}
                                    </div>

                                    <div className="space-y-1">
                                        <label className="block text-xs font-medium text-slate-400">
                                            Catatan {action === 'reject' ? '(sangat disarankan)' : '(opsional)'}
                                        </label>
                                        <textarea
                                            value={note} onChange={e => setNote(e.target.value)} rows={2}
                                            className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white outline-none resize-none focus:border-amber-400/40 transition"
                                        />
                                    </div>

                                    {saveError && (
                                        <div className="rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-300">{saveError}</div>
                                    )}

                                    <div className="flex justify-end">
                                        <button
                                            onClick={handleReview} disabled={saving}
                                            className={`rounded-xl px-6 py-2.5 text-sm font-semibold text-white disabled:opacity-50 transition
                                                ${action === 'approve' ? 'bg-emerald-500 hover:bg-emerald-400' : 'bg-red-500 hover:bg-red-400'}`}
                                        >
                                            {saving ? 'Memproses…' : action === 'approve' ? 'Setujui Tagihan' : 'Tolak Tagihan'}
                                        </button>
                                    </div>
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

function TabTagihan() {
    const [data,       setData]       = useState(null);
    const [loading,    setLoading]    = useState(true);
    const [error,      setError]      = useState(null);
    const [page,       setPage]       = useState(1);
    const [status,     setStatus]     = useState('');
    const [selectedId, setSelectedId] = useState(null);

    const fetch = useCallback(() => {
        setLoading(true);
        api.get('/transport-billings', { page, ...(status ? { status } : {}) })
            .then(setData)
            .catch(e => setError(e.message))
            .finally(() => setLoading(false));
    }, [page, status]);

    useEffect(() => { fetch(); }, [fetch]);

    const columns = [
        {
            key: 'company_name', label: 'Perusahaan',
            render: r => (
                <div>
                    <p className="text-sm font-medium text-white">{r.company_name}</p>
                    {r.submitted_by && <p className="text-xs text-slate-500 truncate max-w-[180px]">{r.submitted_by}</p>}
                </div>
            ),
        },
        { key: 'period', label: 'Periode', render: r => <span className="font-medium text-white">{r.period}</span> },
        {
            key: 'rekap', label: 'Rekap',
            render: r => (
                <div>
                    <p className="text-sm text-white">{r.total_orders} pesanan</p>
                    <p className="text-xs font-semibold text-sky-300">{formatRupiah(r.total_shipping)}</p>
                </div>
            ),
        },
        { key: 'status', label: 'Status', render: r => <BillingStatusChip value={r.status} /> },
        {
            key: 'reviewed_by', label: 'Ditinjau',
            render: r => r.reviewed_by
                ? <span className="text-xs text-slate-400 truncate max-w-[140px] block">{r.reviewed_by}</span>
                : <span className="text-slate-600">—</span>,
        },
    ];

    return (
        <div className="space-y-4">
            <div className="flex gap-3">
                <select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}
                    className="rounded-xl border border-white/10 bg-slate-950/50 px-3 py-2 text-sm text-slate-300 outline-none focus:border-amber-400/30 transition">
                    <option value="">Semua Status</option>
                    <option value="submitted">Menunggu Persetujuan</option>
                    <option value="approved">Disetujui</option>
                    <option value="rejected">Ditolak</option>
                </select>
            </div>

            {error && <div className="rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-300">{error}</div>}

            <div className="text-xs text-slate-600 -mb-1">Klik baris untuk melihat rincian sopir &amp; tonase</div>

            <Table
                columns={columns}
                data={data?.data}
                loading={loading}
                emptyMessage="Belum ada tagihan masuk."
                rowProps={row => ({
                    onClick: () => setSelectedId(row.id),
                    className: 'cursor-pointer',
                })}
            />
            <Pagination meta={data} onPageChange={setPage} />

            {selectedId && (
                <BillingDetailModal
                    billingId={selectedId}
                    onClose={() => setSelectedId(null)}
                    onRefresh={fetch}
                />
            )}
        </div>
    );
}

// ─── Tab: Ajuan Gudang ───────────────────────────────────────────────────────

function TabGudang() {
    const [data,    setData]    = useState([]);
    const [loading, setLoading] = useState(true);
    const [error,   setError]   = useState(null);
    const [status,  setStatus]  = useState('');
    const [target,  setTarget]  = useState(null);

    const fetch = useCallback(() => {
        setLoading(true);
        api.get('/gudang-submissions', { ...(status ? { status } : {}) })
            .then(setData)
            .catch(e => setError(e.message))
            .finally(() => setLoading(false));
    }, [status]);

    useEffect(() => { fetch(); }, [fetch]);

    const columns = [
        {
            key: 'nama_gudang', label: 'Gudang',
            render: r => (
                <div>
                    <p className="text-sm font-medium text-white">{r.nama_gudang}</p>
                    <p className="text-xs text-slate-500">{r.region?.nama_reg || '—'}</p>
                </div>
            ),
        },
        {
            key: 'nama_pic', label: 'PIC',
            render: r => (
                <div>
                    <p className="text-sm text-white">{r.nama_pic || '—'}</p>
                    {r.no_telp && <p className="text-xs text-slate-500">{r.no_telp}</p>}
                </div>
            ),
        },
        {
            key: 'submitted_by', label: 'Diajukan Oleh',
            render: r => <SubmitterCell name={r.submitted_by_name} email={r.submitted_by} />,
        },
        {
            key: 'lokasi', label: 'Wilayah Cakupan',
            render: r => {
                const list = r.kecamatans ?? [];
                if (list.length === 0) return <span className="text-xs text-slate-600">—</span>;
                const shown = list.slice(0, 3).map(k => k.nama_kec).join(', ');
                const rest  = list.length - 3;
                return (
                    <p className="text-xs text-slate-400" title={list.map(k => `${k.nama_kec} (${k.kabupaten?.nama_kab})`).join(', ')}>
                        {shown}{rest > 0 ? ` +${rest} lainnya` : ''}
                    </p>
                );
            },
        },
        { key: 'status', label: 'Status', render: r => <StatusChip value={r.status} /> },
        {
            key: 'review_note', label: 'Catatan',
            render: r => r.review_note
                ? <span className="text-xs text-slate-400 truncate max-w-[140px] block" title={r.review_note}>{r.review_note}</span>
                : null,
        },
    ];

    return (
        <div className="space-y-4">
            <div className="flex gap-3">
                <select value={status} onChange={e => setStatus(e.target.value)}
                    className="rounded-xl border border-white/10 bg-slate-950/50 px-3 py-2 text-sm text-slate-300 outline-none focus:border-amber-400/30 transition">
                    <option value="">Semua</option>
                    <option value="pending">Menunggu Persetujuan</option>
                    <option value="approved">Disetujui</option>
                    <option value="rejected">Ditolak</option>
                </select>
            </div>

            {error && <div className="rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-300">{error}</div>}

            <Table
                columns={columns}
                data={data}
                loading={loading}
                emptyMessage="Belum ada ajuan gudang."
                rowProps={row => ({ onClick: () => setTarget(row), className: 'cursor-pointer' })}
            />

            {target && (
                <ReviewModal
                    title={target.status === 'pending' ? 'Tinjau Ajuan Gudang' : 'Detail Ajuan Gudang'}
                    readOnly={target.status !== 'pending'}
                    summary={
                        <div className="space-y-1 text-xs">
                            <p><span className="text-slate-500">Nama Gudang:</span> <strong className="text-white">{target.nama_gudang}</strong></p>
                            <p><span className="text-slate-500">PIC:</span> {target.nama_pic}{target.no_telp ? ` (${target.no_telp})` : ''}</p>
                            <p><span className="text-slate-500">Region:</span> {target.region?.nama_reg}</p>
                            <p><span className="text-slate-500">Diajukan oleh:</span> {target.submitted_by}</p>
                            <p><span className="text-slate-500">Propinsi:</span> {target.propinsi?.nama_pro || '—'}</p>
                            <p><span className="text-slate-500">Wilayah Cakupan:</span> {(target.kecamatans ?? []).length > 0
                                ? target.kecamatans.map(k => `${k.nama_kec} (${k.kabupaten?.nama_kab})`).join(', ')
                                : '—'}</p>
                            {target.alamat_gudang && <p><span className="text-slate-500">Alamat:</span> {target.alamat_gudang}</p>}
                        </div>
                    }
                    onClose={() => { setTarget(null); fetch(); }}
                    onApprove={note => api.post(`/gudang-submissions/${target.id}/approve`, { review_note: note })}
                    onReject={note  => api.post(`/gudang-submissions/${target.id}/reject`,  { review_note: note })}
                />
            )}
        </div>
    );
}

// ─── Tab: Pengajuan SO ────────────────────────────────────────────────────────

function fTon(v) {
    return v == null ? '—' : `${Number(v).toLocaleString('id-ID', { maximumFractionDigits: 2 })} TON`;
}

// Per baris (kecamatan+produk): bukan cuma approve/reject seperti ajuan lain — kalau
// disetujui wajib isi kode SO + pilih minimal 1 gudang aktif yang mencakup kecamatan itu.
function SoReviewModal({ title, lines, onClose, onSubmit, readOnly = false }) {
    const [decisions, setDecisions] = useState(() => {
        const map = {};
        lines.forEach(l => { map[l.id] = { status: 'approved', so_code: l.so_code ?? '', gudangIds: (l.gudangs ?? []).map(g => g.id) }; });
        return map;
    });
    const [note,   setNote]   = useState('');
    const [saving, setSaving] = useState(false);
    const [error,  setError]  = useState(null);

    function setLine(id, patch) {
        setDecisions(d => ({ ...d, [id]: { ...d[id], ...patch } }));
    }

    function toggleGudang(id, gudangId) {
        setDecisions(d => {
            const current = d[id].gudangIds;
            const next = current.includes(gudangId) ? current.filter(g => g !== gudangId) : [...current, gudangId];
            return { ...d, [id]: { ...d[id], gudangIds: next } };
        });
    }

    async function handleSubmit() {
        setError(null);
        for (const l of lines) {
            const dec = decisions[l.id];
            if (dec.status === 'approved' && !dec.so_code.trim()) {
                setError(`Kode SO wajib diisi untuk ${l.kecamatan?.nama_kec ?? 'baris'} — ${l.product_name}.`);
                return;
            }
            if (dec.status === 'approved' && dec.gudangIds.length === 0) {
                setError(`Pilih minimal 1 gudang aktif untuk ${l.kecamatan?.nama_kec ?? 'baris'} — ${l.product_name}.`);
                return;
            }
        }
        setSaving(true);
        try {
            const payload = lines.map(l => ({
                id:                     l.id,
                status:                 decisions[l.id].status,
                so_code:                decisions[l.id].status === 'approved' ? decisions[l.id].so_code.trim() : null,
                gudang_submission_ids:  decisions[l.id].status === 'approved' ? decisions[l.id].gudangIds : [],
            }));
            await onSubmit(payload, note);
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
            <div className="relative z-10 w-full max-w-3xl max-h-[85vh] overflow-y-auto rounded-2xl border border-white/10 bg-slate-900 shadow-2xl">
                <div className="border-b border-white/8 px-6 py-4">
                    <h2 className="text-base font-semibold text-white">{title}</h2>
                </div>

                <div className="space-y-3 px-6 py-5">
                    {error && <div className="rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-300">{error}</div>}

                    {lines.map(l => {
                        const dec = readOnly ? null : decisions[l.id];
                        return (
                            <div key={l.id} className="rounded-xl border border-white/8 bg-white/3 overflow-hidden">
                                <div className="flex items-center justify-between px-3 py-2 border-b border-white/8">
                                    <div>
                                        <p className="text-sm font-medium text-white">
                                            {l.kecamatan?.nama_kec} <span className="text-xs text-slate-500">({l.kecamatan?.kabupaten?.nama_kab})</span>
                                        </p>
                                        <p className="text-xs text-slate-400">
                                            {l.product_code && <span className="font-mono mr-1">{l.product_code}</span>}
                                            {l.product_name} — {fTon(l.total_quantity)}
                                        </p>
                                    </div>
                                    {readOnly ? (
                                        l.status
                                            ? <StatusChip value={l.status} />
                                            : <span className="text-xs text-slate-600">—</span>
                                    ) : (
                                        <div className="flex gap-1.5">
                                            <button type="button" onClick={() => setLine(l.id, { status: 'approved' })}
                                                className={`rounded-lg px-2.5 py-1 text-xs border transition ${dec.status === 'approved' ? 'border-emerald-400/40 bg-emerald-400/20 text-emerald-300' : 'border-white/10 text-slate-500 hover:text-white'}`}>
                                                Setuju
                                            </button>
                                            <button type="button" onClick={() => setLine(l.id, { status: 'rejected' })}
                                                className={`rounded-lg px-2.5 py-1 text-xs border transition ${dec.status === 'rejected' ? 'border-red-400/40 bg-red-400/20 text-red-300' : 'border-white/10 text-slate-500 hover:text-white'}`}>
                                                Tolak
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {readOnly && l.status === 'approved' && (
                                    <div className="px-3 py-2.5 space-y-1">
                                        <p className="text-xs text-slate-500">
                                            Kode SO: <span className="font-mono text-emerald-300">{l.so_code || '—'}</span>
                                        </p>
                                        {(l.gudangs ?? []).length > 0 && (
                                            <p className="text-xs text-slate-500">
                                                Gudang: {l.gudangs.map(g => g.nama_gudang).join(', ')}
                                            </p>
                                        )}
                                    </div>
                                )}

                                {!readOnly && dec?.status === 'approved' && (
                                    <div className="space-y-2 px-3 py-3">
                                        <div className="space-y-1">
                                            <label className="block text-xs font-medium text-slate-400">Kode SO</label>
                                            <input value={dec.so_code} onChange={e => setLine(l.id, { so_code: e.target.value })}
                                                placeholder="mis. SO-2026-0001"
                                                className="w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-1.5 text-sm text-white outline-none focus:border-amber-400/40 transition" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="block text-xs font-medium text-slate-400">Gudang Aktif (boleh lebih dari 1)</label>
                                            {(l.gudang_options ?? []).length === 0 ? (
                                                <p className="text-xs italic text-slate-500">Tidak ada gudang yang mencakup kecamatan ini.</p>
                                            ) : (
                                                <div className="flex flex-wrap gap-1.5">
                                                    {l.gudang_options.map(g => (
                                                        <button key={g.id} type="button" onClick={() => toggleGudang(l.id, g.id)}
                                                            className={`rounded-lg px-2.5 py-1 text-xs border transition ${dec.gudangIds.includes(g.id) ? 'border-teal-400/40 bg-teal-400/20 text-teal-300' : 'border-white/10 text-slate-400 hover:text-white'}`}>
                                                            {g.nama_gudang}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}

                    {!readOnly && (
                        <div className="space-y-1 pt-1">
                            <label className="block text-xs font-medium text-slate-400">Catatan (opsional)</label>
                            <textarea value={note} onChange={e => setNote(e.target.value)} rows={2}
                                className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white outline-none resize-none focus:border-amber-400/40 transition" />
                        </div>
                    )}
                </div>

                <div className="flex justify-end gap-3 border-t border-white/8 px-6 py-4">
                    <button type="button" onClick={onClose}
                        className="rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-400 hover:text-white transition">
                        {readOnly ? 'Tutup' : 'Batal'}
                    </button>
                    {!readOnly && (
                        <button type="button" onClick={handleSubmit} disabled={saving}
                            className="rounded-xl bg-amber-400 px-5 py-2 text-sm font-semibold text-slate-950 hover:bg-amber-300 disabled:opacity-50 transition">
                            {saving ? 'Menyimpan…' : 'Simpan Keputusan'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

function TabPengajuanSO() {
    const [data,          setData]          = useState(null);
    const [loading,       setLoading]       = useState(true);
    const [error,         setError]         = useState(null);
    const [page,          setPage]          = useState(1);
    const [status,        setStatus]        = useState('');
    const [target,        setTarget]        = useState(null);
    const [targetDetail,  setTargetDetail]  = useState(null);
    const [detailLoading, setDetailLoading] = useState(false);

    const fetch = useCallback(() => {
        setLoading(true);
        api.get('/so-submissions', { page, ...(status ? { status } : {}) })
            .then(setData)
            .catch(e => setError(e.message))
            .finally(() => setLoading(false));
    }, [page, status]);

    useEffect(() => { fetch(); }, [fetch]);

    async function openReview(row) {
        setTarget(row);
        setDetailLoading(true);
        try {
            const detail = await api.get(`/so-submissions/${row.id}`);
            setTargetDetail(detail);
        } catch {
            setTargetDetail(null);
        } finally {
            setDetailLoading(false);
        }
    }

    function closeReview() { setTarget(null); setTargetDetail(null); fetch(); }

    const columns = [
        {
            key: 'region', label: 'Region',
            render: r => <span className="font-medium text-teal-300">{r.region}</span>,
        },
        {
            key: 'rekap', label: 'Rekap SO',
            render: r => (
                <div>
                    <p className="text-sm text-white">{r.lines_count ?? 0} kombinasi produk+kec</p>
                    <p className="text-xs text-slate-500">{r.so_codes_count ?? 0} disetujui · {r.gudang_count ?? 0} gudang</p>
                </div>
            ),
        },
        {
            key: 'submitted_by', label: 'Diajukan Oleh',
            render: r => <SubmitterCell name={r.submitted_by_name} email={r.submitted_by} />,
        },
        {
            key: 'created_at', label: 'Diajukan',
            render: r => <span className="text-xs text-slate-400">{formatDate(r.created_at)}</span>,
        },
        { key: 'status', label: 'Status', render: r => <StatusChip value={r.status} /> },
        {
            key: 'review_note', label: 'Catatan',
            render: r => r.review_note
                ? <span className="text-xs text-slate-400 truncate max-w-[140px] block" title={r.review_note}>{r.review_note}</span>
                : null,
        },
    ];

    return (
        <div className="space-y-4">
            <div className="flex gap-3">
                <select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}
                    className="rounded-xl border border-white/10 bg-slate-950/50 px-3 py-2 text-sm text-slate-300 outline-none focus:border-amber-400/30 transition">
                    <option value="">Semua</option>
                    <option value="submitted">Menunggu Persetujuan</option>
                    <option value="approved">Disetujui</option>
                    <option value="partially_approved">Sebagian Disetujui</option>
                    <option value="rejected">Ditolak</option>
                </select>
            </div>

            {error && <div className="rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-300">{error}</div>}

            <Table
                columns={columns}
                data={data?.data}
                loading={loading}
                emptyMessage="Belum ada pengajuan SO."
                rowProps={row => ({ onClick: () => openReview(row), className: 'cursor-pointer' })}
            />
            <Pagination meta={data} onPageChange={setPage} />

            {target && detailLoading && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-400 border-t-transparent" />
                </div>
            )}
            {target && targetDetail && (
                <SoReviewModal
                    title={target.status === 'submitted' ? `Tinjau Pengajuan SO — ${target.region}` : `Detail Pengajuan SO — ${target.region}`}
                    lines={targetDetail.lines}
                    readOnly={target.status !== 'submitted'}
                    onClose={closeReview}
                    onSubmit={(decisions, note) => api.post(`/so-submissions/${target.id}/review`, { decisions, review_note: note })}
                />
            )}
        </div>
    );
}

// ─── Main page ────────────────────────────────────────────────────────────────

const TABS = [
    { key: 'harga',   label: 'Harga Produk',      icon: Wallet },
    { key: 'quota',   label: 'Quota Subsidi',      icon: Coins },
    { key: 'tagihan', label: 'Tagihan Transport',  icon: FileText },
    { key: 'gudang',  label: 'Ajuan Gudang',       icon: Warehouse },
    { key: 'so',      label: 'Pengajuan SO',        icon: Truck },
];

export default function Persetujuan() {
    const [tab, setTab] = useState('harga');

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-semibold text-white">Persetujuan Ajuan</h1>
                <p className="mt-1 text-sm text-slate-500">
                    Tinjau dan setujui ajuan harga produk, quota subsidi, tagihan transportir, ajuan gudang, dan pengajuan SO.
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

            {tab === 'harga'   && <TabHargaProduk />}
            {tab === 'quota'   && <TabQuota />}
            {tab === 'tagihan' && <TabTagihan />}
            {tab === 'gudang'  && <TabGudang />}
            {tab === 'so'      && <TabPengajuanSO />}
        </div>
    );
}
