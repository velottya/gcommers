import { FileText, Send } from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';
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

function PreviewCard({ company, period }) {
    const [data,    setData]    = useState(null);
    const [loading, setLoading] = useState(false);
    const [error,   setError]   = useState(null);
    const [saving,  setSaving]  = useState(false);
    const [saved,   setSaved]   = useState(false);

    function fetchPreview() {
        if (!period) return;
        setLoading(true);
        setError(null);
        api.get('/transport-billings/preview', { period })
            .then(setData)
            .catch(e => setError(e.message))
            .finally(() => setLoading(false));
    }

    useEffect(() => { fetchPreview(); }, [period]);

    async function handleGenerate() {
        setSaving(true);
        setError(null);
        try {
            await api.post('/transport-billings', { period });
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        } catch (err) {
            setError(err.message || 'Gagal membuat tagihan.');
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="rounded-2xl border border-white/8 bg-slate-950/55 p-6 space-y-4">
            <h2 className="text-base font-semibold text-white">Preview Tagihan Bulan Ini</h2>

            {error && (
                <div className="rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-300">{error}</div>
            )}
            {saved && (
                <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-300">
                    Tagihan berhasil dibuat. Anda dapat mengajukannya dari tabel di bawah.
                </div>
            )}

            {loading ? (
                <div className="space-y-2">
                    {[1, 2, 3].map(i => <div key={i} className="h-10 animate-pulse rounded-lg bg-white/5" />)}
                </div>
            ) : data ? (
                <>
                    <dl className="grid grid-cols-3 gap-4">
                        <div className="rounded-xl border border-white/8 bg-white/3 p-4">
                            <dt className="text-xs uppercase tracking-[0.2em] text-slate-500">Total Order</dt>
                            <dd className="mt-1 text-2xl font-semibold text-white">{data.total_orders}</dd>
                        </div>
                        <div className="rounded-xl border border-white/8 bg-white/3 p-4">
                            <dt className="text-xs uppercase tracking-[0.2em] text-slate-500">Ongkos Kirim</dt>
                            <dd className="mt-1 text-lg font-semibold text-sky-300">{formatRupiah(data.total_shipping)}</dd>
                        </div>
                        <div className="rounded-xl border border-white/8 bg-white/3 p-4">
                            <dt className="text-xs uppercase tracking-[0.2em] text-slate-500">Total Nilai Order</dt>
                            <dd className="mt-1 text-lg font-semibold text-amber-300">{formatRupiah(data.total_amount)}</dd>
                        </div>
                    </dl>
                    <button onClick={handleGenerate} disabled={saving || data.total_orders === 0}
                        className="flex items-center gap-2 rounded-xl bg-sky-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-400 disabled:opacity-50 transition">
                        <FileText size={15} />
                        {saving ? 'Membuat…' : 'Buat Tagihan Draft'}
                    </button>
                </>
            ) : null}
        </div>
    );
}

export default function RekapTagihan({ user }) {
    const [data,    setData]    = useState(null);
    const [loading, setLoading] = useState(true);
    const [error,   setError]   = useState(null);
    const [page,    setPage]    = useState(1);
    const [period,  setPeriod]  = useState('');

    const fetch = useCallback(() => {
        setLoading(true);
        api.get('/transport-billings', { page, ...(period ? { period } : {}) })
            .then(setData)
            .catch(e => setError(e.message))
            .finally(() => setLoading(false));
    }, [page, period]);

    useEffect(() => { fetch(); }, [fetch]);

    async function handleSubmit(id) {
        try {
            await api.post(`/transport-billings/${id}/submit`);
            fetch();
        } catch (err) {
            alert(err.message || 'Gagal mengajukan tagihan.');
        }
    }

    const columns = [
        { key: 'period',         label: 'Periode' },
        { key: 'total_orders',   label: 'Jml Order' },
        { key: 'total_shipping', label: 'Ongkos Kirim',       render: r => formatRupiah(r.total_shipping) },
        { key: 'total_amount',   label: 'Total Nilai',        render: r => formatRupiah(r.total_amount) },
        { key: 'status',         label: 'Status',             render: r => <StatusChip value={r.status} /> },
        { key: 'reviewed_by',    label: 'Ditinjau Oleh',      render: r => r.reviewed_by || '—' },
        { key: 'note',           label: 'Catatan',            render: r => r.note || '—' },
        {
            key: '_act', label: '',
            render: r => r.status === 'draft' ? (
                <button onClick={() => handleSubmit(r.id)}
                    className="flex items-center gap-1.5 rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-1.5 text-xs font-medium text-amber-300 hover:bg-amber-400/20 transition">
                    <Send size={13} /> Ajukan
                </button>
            ) : null,
        },
    ];

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-semibold text-white">Rekap Tagihan</h1>
                <p className="mt-1 text-sm text-slate-500">
                    Ringkasan tagihan biaya pengiriman per bulan.
                </p>
            </div>

            <PreviewCard company={user.companyName} period={currentPeriod()} />

            <div className="flex items-center gap-3">
                <input type="month" value={period} onChange={e => { setPeriod(e.target.value); setPage(1); }}
                    className="rounded-xl border border-white/10 bg-slate-950/50 px-3 py-2 text-sm text-slate-300 outline-none focus:border-sky-400/30 transition" />
                {period && (
                    <button onClick={() => { setPeriod(''); setPage(1); }}
                        className="rounded-xl border border-white/10 px-3 py-2 text-sm text-slate-500 hover:text-white transition">
                        Reset
                    </button>
                )}
            </div>

            {error && (
                <div className="rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-300">{error}</div>
            )}

            <Table
                columns={columns}
                data={data?.data}
                loading={loading}
                emptyMessage="Belum ada tagihan. Gunakan tombol di atas untuk membuat tagihan baru."
            />
            <Pagination meta={data} onPageChange={setPage} />
        </div>
    );
}
