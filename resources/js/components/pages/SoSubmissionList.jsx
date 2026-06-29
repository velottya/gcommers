import { Eye, X } from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';
import { api } from '../../api/client';
import { Pagination, Table } from '../ui/Table';

const STATUS_CFG = {
    submitted:           { label: 'Diajukan',           color: 'text-amber-300 bg-amber-400/10 border-amber-400/20' },
    approved:            { label: 'Disetujui',          color: 'text-emerald-300 bg-emerald-400/10 border-emerald-400/20' },
    partially_approved:  { label: 'Sebagian Disetujui', color: 'text-orange-300 bg-orange-400/10 border-orange-400/20' },
    rejected:            { label: 'Ditolak',            color: 'text-red-300 bg-red-400/10 border-red-400/20' },
    pending:             { label: 'Menunggu Peninjauan', color: 'text-amber-300 bg-amber-400/10 border-amber-400/20' },
};

function StatusChip({ value }) {
    const cfg = STATUS_CFG[value] ?? STATUS_CFG.submitted;
    return <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${cfg.color}`}>{cfg.label}</span>;
}

function fTon(v) {
    return v == null ? '—' : `${Number(v).toLocaleString('id-ID', { maximumFractionDigits: 2 })} TON`;
}

function formatDateTime(val) {
    if (!val) return '—';
    return new Date(val).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
}

function DetailModal({ submission, onClose }) {
    if (!submission) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={onClose} />
            <div className="relative z-10 w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl border border-white/10 bg-slate-900 shadow-2xl">
                <div className="flex items-center justify-between border-b border-white/8 px-6 py-4">
                    <h2 className="text-base font-semibold text-white">Detail Pengajuan SO — {submission.region}</h2>
                    <button onClick={onClose} className="rounded-lg p-1 text-slate-500 hover:text-white transition"><X size={18} /></button>
                </div>

                <div className="space-y-3 px-6 py-5">
                    {(submission.lines ?? []).map(l => (
                        <div key={l.id} className="rounded-xl border border-white/8 bg-white/3 px-4 py-3">
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <p className="text-sm font-medium text-white">
                                        {l.kecamatan?.nama_kec} <span className="text-xs text-slate-500">({l.kecamatan?.kabupaten?.nama_kab})</span>
                                    </p>
                                    <p className="text-xs text-slate-400">
                                        {l.product_code && <span className="font-mono mr-1">{l.product_code}</span>}
                                        {l.product_name} — {fTon(l.total_quantity)}
                                    </p>
                                </div>
                                <StatusChip value={l.status} />
                            </div>
                            {l.status === 'approved' && (
                                <div className="mt-2 space-y-1 border-t border-white/8 pt-2 text-xs">
                                    <p><span className="text-slate-500">Kode SO:</span> <span className="font-mono text-emerald-300">{l.so_code}</span></p>
                                    <p><span className="text-slate-500">Gudang Aktif:</span> {(l.gudangs ?? []).map(g => g.nama_gudang).join(', ') || '—'}</p>
                                </div>
                            )}
                            {l.review_note && <p className="mt-2 text-xs text-slate-400">Catatan: {l.review_note}</p>}
                        </div>
                    ))}
                </div>

                <div className="flex justify-end gap-3 border-t border-white/8 px-6 py-4">
                    <button onClick={onClose} className="rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-400 hover:text-white transition">
                        Tutup
                    </button>
                </div>
            </div>
        </div>
    );
}

// Riwayat pengajuan SO milik AdminRegion (read-only) — pembuatannya otomatis lewat
// tombol "Ajukan SO" di Daftar Pesanan, peninjauan dilakukan SuperAdmin di Persetujuan.
export default function SoSubmissionList() {
    const [data,    setData]    = useState(null);
    const [loading, setLoading] = useState(true);
    const [error,   setError]   = useState(null);
    const [page,    setPage]    = useState(1);
    const [detailTarget, setDetailTarget] = useState(null);
    const [detailLoading, setDetailLoading] = useState(false);

    const fetchData = useCallback(() => {
        setLoading(true);
        api.get('/so-submissions', { page })
            .then(setData)
            .catch(e => setError(e.message))
            .finally(() => setLoading(false));
    }, [page]);

    useEffect(() => { fetchData(); }, [fetchData]);

    async function openDetail(row) {
        setDetailLoading(true);
        try {
            const detail = await api.get(`/so-submissions/${row.id}`);
            setDetailTarget(detail);
        } catch (e) {
            setError(e.message);
        } finally {
            setDetailLoading(false);
        }
    }

    const columns = [
        { key: 'created_at',   label: 'Tanggal Ajuan', render: r => formatDateTime(r.created_at) },
        { key: 'lines_count',  label: 'Jml Baris SO',  render: r => <span className="text-xs font-mono">{r.lines_count} baris</span> },
        { key: 'status',       label: 'Status',        render: r => <StatusChip value={r.status} /> },
        { key: 'reviewed_by',  label: 'Ditinjau Oleh',  render: r => r.reviewed_by ? <span className="text-xs text-slate-400">{r.reviewed_by}</span> : null },
        {
            key: '_act', label: '',
            render: r => (
                <button onClick={() => openDetail(r)}
                    className="rounded-lg p-1.5 text-slate-500 hover:text-amber-400 hover:bg-amber-400/10 transition" title="Detail">
                    <Eye size={15} />
                </button>
            ),
        },
    ];

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-semibold text-white">Pengajuan SO</h1>
                <p className="mt-1 text-sm text-slate-500">
                    Riwayat pengajuan kode SO — diajukan otomatis lewat tombol &quot;Ajukan SO&quot; di Daftar Pesanan, ditinjau SuperAdmin.
                </p>
            </div>

            {error && (
                <div className="rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-300">{error}</div>
            )}

            <Table columns={columns} data={data?.data} loading={loading} emptyMessage="Belum ada pengajuan SO." />
            <Pagination meta={data} onPageChange={setPage} />

            {detailLoading && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-400 border-t-transparent" />
                </div>
            )}
            <DetailModal submission={detailTarget} onClose={() => setDetailTarget(null)} />
        </div>
    );
}
