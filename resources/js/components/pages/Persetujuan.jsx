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
    submitted: { label: 'Diajukan', color: 'text-amber-300 bg-amber-400/10 border-amber-400/20' },
    approved:  { label: 'Disetujui', color: 'text-emerald-300 bg-emerald-400/10 border-emerald-400/20' },
    rejected:  { label: 'Ditolak',  color: 'text-red-300 bg-red-400/10 border-red-400/20' },
    draft:     { label: 'Draft',    color: 'text-slate-400 bg-slate-400/10 border-slate-400/20' },
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

// ─── Tab: Alokasi Biaya ───────────────────────────────────────────────────────

function TabAlokasibiaya() {
    const [data,    setData]    = useState(null);
    const [loading, setLoading] = useState(true);
    const [error,   setError]   = useState(null);
    const [page,    setPage]    = useState(1);
    const [status,  setStatus]  = useState('submitted');
    const [target,  setTarget]  = useState(null);

    const fetch = useCallback(() => {
        setLoading(true);
        api.get('/order-cost-allocations', { page, ...(status ? { status } : {}) })
            .then(setData)
            .catch(e => setError(e.message))
            .finally(() => setLoading(false));
    }, [page, status]);

    useEffect(() => { fetch(); }, [fetch]);

    const columns = [
        { key: 'poNumber',        label: 'PO Number',    render: r => <span className="font-mono text-xs">{r.poNumber || r.order_id}</span> },
        { key: 'region',          label: 'Region' },
        { key: 'shipping_cost',   label: 'Ongkir',       render: r => formatRupiah(r.shipping_cost) },
        { key: 'pph_amount',      label: 'PPH',          render: r => formatRupiah(r.pph_amount) },
        { key: 'ppn_amount',      label: 'PPN',          render: r => formatRupiah(r.ppn_amount) },
        { key: 'total_allocated', label: 'Total',        render: r => <span className="font-semibold text-teal-300">{formatRupiah(r.total_allocated)}</span> },
        { key: 'allocated_by',    label: 'Diajukan Oleh',render: r => <span className="text-xs text-slate-400">{r.allocated_by}</span> },
        { key: 'status',          label: 'Status',       render: r => <StatusChip value={r.status} /> },
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

            <Table columns={columns} data={data?.data} loading={loading} emptyMessage="Tidak ada ajuan alokasi biaya." />
            <Pagination meta={data} onPageChange={setPage} />

            {target && (
                <ReviewModal
                    title="Tinjau Alokasi Biaya"
                    summary={
                        <div className="space-y-1 text-xs">
                            <p><span className="text-slate-500">Order:</span> {target.poNumber || target.order_id}</p>
                            <p><span className="text-slate-500">Region:</span> {target.region}</p>
                            <p><span className="text-slate-500">Ongkir:</span> {formatRupiah(target.shipping_cost)}</p>
                            <p><span className="text-slate-500">PPH:</span> {formatRupiah(target.pph_amount)} &nbsp; <span className="text-slate-500">PPN:</span> {formatRupiah(target.ppn_amount)}</p>
                            <p><span className="text-slate-500">Total:</span> <strong className="text-teal-300">{formatRupiah(target.total_allocated)}</strong></p>
                            {target.notes && <p><span className="text-slate-500">Catatan:</span> {target.notes}</p>}
                        </div>
                    }
                    onClose={() => { setTarget(null); fetch(); }}
                    onApprove={note => api.post(`/order-cost-allocations/${target.id}/approve`, { review_note: note })}
                    onReject={note  => api.post(`/order-cost-allocations/${target.id}/reject`,  { review_note: note })}
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

    const columns = [
        { key: 'region',         label: 'Region' },
        { key: 'year',           label: 'Tahun',  render: r => <span className="font-semibold text-white">{r.year}</span> },
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

    const detailSummary = targetDetail ? (
        <div className="space-y-3 text-xs">
            <div className="space-y-1">
                <p><span className="text-slate-500">Region:</span> <strong className="text-white">{targetDetail.region}</strong></p>
                <p><span className="text-slate-500">Tahun:</span> {targetDetail.year}</p>
                {targetDetail.notes && <p><span className="text-slate-500">Catatan:</span> {targetDetail.notes}</p>}
            </div>
            <div className="border-t border-white/8 pt-2 space-y-2">
                <p className="font-medium text-slate-400">Rincian Produk ({targetDetail.products?.length ?? 0} produk)</p>
                {(targetDetail.products ?? []).map(p => (
                    <div key={p.id} className="rounded-lg border border-white/8 bg-white/3 px-3 py-2 space-y-1">
                        <div className="flex justify-between">
                            <span className="font-medium text-white">{p.product_name}</span>
                            <span className="text-amber-300 font-mono">{fTon(p.total_qty_ton)}</span>
                        </div>
                        <div className="pl-2 space-y-0.5 text-slate-400">
                            {(p.kiosk_allocations ?? []).map(k => (
                                <div key={k.id} className="flex justify-between">
                                    <span>{k.kiosk_name}</span>
                                    <span className="font-mono">{fTon(k.qty_ton)}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    ) : detailLoading ? (
        <div className="flex justify-center py-4">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-amber-400 border-t-transparent" />
        </div>
    ) : (
        <div className="text-xs text-slate-400">
            <p><span className="text-slate-500">Region:</span> {target?.region}</p>
            <p><span className="text-slate-500">Tahun:</span> {target?.year}</p>
        </div>
    );

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

            {target && (
                <ReviewModal
                    title={`Tinjau Quota Subsidi — ${target.region} ${target.year}`}
                    summary={detailSummary}
                    onClose={closeReview}
                    onApprove={note => api.post(`/quota-subsidi/${target.id}/approve`, { review_note: note })}
                    onReject={note  => api.post(`/quota-subsidi/${target.id}/reject`,  { review_note: note })}
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
