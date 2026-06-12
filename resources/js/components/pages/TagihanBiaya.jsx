import { CheckCircle, XCircle } from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';
import { api } from '../../api/client';
import { Pagination, Table } from '../ui/Table';

function formatRupiah(val) {
    if (val == null) return '—';
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);
}

function formatDate(val) {
    if (!val) return '—';
    return new Date(val).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
}

const STATUS_LABEL = {
    draft:     { label: 'Draft',     color: 'text-slate-300 bg-slate-400/10 border-slate-400/20' },
    submitted: { label: 'Diajukan', color: 'text-amber-300 bg-amber-400/10 border-amber-400/20' },
    approved:  { label: 'Disetujui', color: 'text-emerald-300 bg-emerald-400/10 border-emerald-400/20' },
    rejected:  { label: 'Ditolak',  color: 'text-red-300 bg-red-400/10 border-red-400/20' },
};

function StatusChip({ value }) {
    const cfg = STATUS_LABEL[value] ?? STATUS_LABEL.draft;
    return (
        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${cfg.color}`}>
            {cfg.label}
        </span>
    );
}

function ReviewModal({ billing, onClose, onSaved }) {
    const [action, setAction] = useState('approve');
    const [note,   setNote]   = useState('');
    const [saving, setSaving] = useState(false);
    const [error,  setError]  = useState(null);

    async function handleSubmit(e) {
        e.preventDefault();
        setSaving(true);
        setError(null);
        try {
            await api.post(`/transport-billings/${billing.id}/${action}`, { note });
            onSaved();
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
                    <h2 className="text-base font-semibold text-white">Tinjau Tagihan</h2>
                    <p className="text-xs text-slate-500 mt-0.5">{billing.company_name} — Periode {billing.period}</p>
                </div>

                <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
                    <dl className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                            <dt className="text-xs text-slate-500">Total Order</dt>
                            <dd className="font-semibold text-white">{billing.total_orders}</dd>
                        </div>
                        <div>
                            <dt className="text-xs text-slate-500">Ongkos Kirim</dt>
                            <dd className="font-semibold text-sky-300">{formatRupiah(billing.total_shipping)}</dd>
                        </div>
                        <div>
                            <dt className="text-xs text-slate-500">Total Nilai</dt>
                            <dd className="font-semibold text-amber-300">{formatRupiah(billing.total_amount)}</dd>
                        </div>
                        <div>
                            <dt className="text-xs text-slate-500">Diajukan Oleh</dt>
                            <dd className="text-slate-200 text-xs">{billing.submitted_by}</dd>
                        </div>
                    </dl>

                    {error && (
                        <div className="rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-300">{error}</div>
                    )}

                    <div className="flex gap-2">
                        <button type="button" onClick={() => setAction('approve')}
                            className={`flex flex-1 items-center justify-center gap-2 rounded-xl border py-2.5 text-sm font-medium transition
                                ${action === 'approve'
                                    ? 'border-emerald-400/30 bg-emerald-400/15 text-emerald-300'
                                    : 'border-white/10 text-slate-400 hover:text-slate-200'}`}>
                            <CheckCircle size={15} /> Setujui
                        </button>
                        <button type="button" onClick={() => setAction('reject')}
                            className={`flex flex-1 items-center justify-center gap-2 rounded-xl border py-2.5 text-sm font-medium transition
                                ${action === 'reject'
                                    ? 'border-red-400/30 bg-red-400/15 text-red-300'
                                    : 'border-white/10 text-slate-400 hover:text-slate-200'}`}>
                            <XCircle size={15} /> Tolak
                        </button>
                    </div>

                    <div className="space-y-1">
                        <label className="block text-xs font-medium text-slate-400">
                            Catatan {action === 'reject' ? '(wajib untuk penolakan)' : '(opsional)'}
                        </label>
                        <textarea
                            value={note}
                            onChange={e => setNote(e.target.value)}
                            rows={2}
                            className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white outline-none resize-none focus:border-amber-400/40 transition"
                        />
                    </div>

                    <div className="flex justify-end gap-3">
                        <button type="button" onClick={onClose}
                            className="rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-400 hover:text-white transition">
                            Batal
                        </button>
                        <button type="submit" disabled={saving}
                            className={`rounded-xl px-5 py-2 text-sm font-semibold disabled:opacity-50 transition
                                ${action === 'approve' ? 'bg-emerald-500 text-white hover:bg-emerald-400' : 'bg-red-500 text-white hover:bg-red-400'}`}>
                            {saving ? 'Memproses…' : action === 'approve' ? 'Setujui Tagihan' : 'Tolak Tagihan'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default function TagihanBiaya() {
    const [data,         setData]         = useState(null);
    const [loading,      setLoading]      = useState(true);
    const [error,        setError]        = useState(null);
    const [page,         setPage]         = useState(1);
    const [status,       setStatus]       = useState('');
    const [period,       setPeriod]       = useState('');
    const [reviewTarget, setReviewTarget] = useState(null);

    const fetch = useCallback(() => {
        setLoading(true);
        api.get('/transport-billings', { page, ...(status ? { status } : {}), ...(period ? { period } : {}) })
            .then(setData)
            .catch(e => setError(e.message))
            .finally(() => setLoading(false));
    }, [page, status, period]);

    useEffect(() => { fetch(); }, [fetch]);

    const columns = [
        { key: 'company_name',   label: 'Perusahaan' },
        { key: 'period',         label: 'Periode' },
        { key: 'total_orders',   label: 'Jml Order' },
        { key: 'total_shipping', label: 'Ongkos Kirim',  render: r => formatRupiah(r.total_shipping) },
        { key: 'total_amount',   label: 'Total Nilai',   render: r => formatRupiah(r.total_amount) },
        { key: 'status',         label: 'Status',        render: r => <StatusChip value={r.status} /> },
        { key: 'reviewed_by',    label: 'Ditinjau',      render: r => r.reviewed_by || '—' },
        { key: 'reviewed_at',    label: 'Tgl Tinjau',    render: r => formatDate(r.reviewed_at) },
        {
            key: '_act', label: '',
            render: r => r.status === 'submitted' ? (
                <button onClick={() => setReviewTarget(r)}
                    className="rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-1.5 text-xs font-medium text-amber-300 hover:bg-amber-400/20 transition">
                    Tinjau
                </button>
            ) : null,
        },
    ];

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-semibold text-white">Tagihan Biaya Transportir</h1>
                <p className="mt-1 text-sm text-slate-500">
                    Tinjau dan setujui tagihan biaya pengiriman dari perusahaan transportir.
                </p>
            </div>

            <div className="flex flex-wrap gap-3">
                <select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}
                    className="rounded-xl border border-white/10 bg-slate-950/50 px-3 py-2.5 text-sm text-slate-300 outline-none focus:border-amber-400/30 transition">
                    <option value="">Semua status</option>
                    <option value="submitted">Diajukan</option>
                    <option value="approved">Disetujui</option>
                    <option value="rejected">Ditolak</option>
                    <option value="draft">Draft</option>
                </select>
                <input type="month" value={period} onChange={e => { setPeriod(e.target.value); setPage(1); }}
                    className="rounded-xl border border-white/10 bg-slate-950/50 px-3 py-2.5 text-sm text-slate-300 outline-none focus:border-amber-400/30 transition" />
            </div>

            {error && (
                <div className="rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-300">{error}</div>
            )}

            <Table
                columns={columns}
                data={data?.data}
                loading={loading}
                emptyMessage="Belum ada tagihan masuk."
            />
            <Pagination meta={data} onPageChange={setPage} />

            {reviewTarget && (
                <ReviewModal
                    billing={reviewTarget}
                    onClose={() => setReviewTarget(null)}
                    onSaved={fetch}
                />
            )}
        </div>
    );
}
