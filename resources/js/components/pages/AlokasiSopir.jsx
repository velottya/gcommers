import { Search, UserCheck, X } from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';
import { api } from '../../api/client';
import StatusBadge from '../ui/StatusBadge';
import { Pagination, Table } from '../ui/Table';

function formatDate(val) {
    if (!val) return '—';
    return new Date(val).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

function AssignModal({ order, drivers, onClose, onSaved }) {
    const [selected, setSelected] = useState(order.transportirEmail ?? '');
    const [note,     setNote]     = useState(order.assignmentNote ?? '');
    const [saving,   setSaving]   = useState(false);
    const [error,    setError]    = useState(null);

    async function handleSubmit(e) {
        e.preventDefault();
        if (!selected) { setError('Pilih driver terlebih dahulu.'); return; }
        setSaving(true);
        setError(null);
        try {
            await api.post('/driver-assignments', {
                order_id:          order.id,
                transportir_email: selected,
                note,
            });
            onSaved();
            onClose();
        } catch (err) {
            setError(err.message || 'Gagal menyimpan.');
        } finally {
            setSaving(false);
        }
    }

    async function handleRemove() {
        if (!order.assignmentId) return;
        setSaving(true);
        setError(null);
        try {
            await api.del(`/driver-assignments/${order.assignmentId}`);
            onSaved();
            onClose();
        } catch (err) {
            setError(err.message || 'Gagal menghapus.');
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={onClose} />
            <div className="relative z-10 w-full max-w-md rounded-2xl border border-white/10 bg-slate-900 shadow-2xl">
                <div className="flex items-center justify-between border-b border-white/8 px-6 py-4">
                    <h2 className="flex items-center gap-2 text-base font-semibold text-white">
                        <UserCheck size={16} className="text-sky-400" />
                        Alokasi Sopir
                    </h2>
                    <button onClick={onClose} className="rounded-lg p-1 text-slate-500 hover:text-white transition"><X size={18} /></button>
                </div>

                <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
                    <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Order</p>
                        <p className="mt-0.5 font-mono text-sm text-white">{order.poNumber}</p>
                        <p className="text-xs text-slate-400">{order.userEmail}</p>
                    </div>

                    {error && (
                        <div className="rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-300">{error}</div>
                    )}

                    <div className="space-y-1">
                        <label className="block text-xs font-medium text-slate-400">Pilih Driver</label>
                        <select
                            value={selected}
                            onChange={e => setSelected(e.target.value)}
                            className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-sky-400/40 transition"
                        >
                            <option value="">— Pilih driver —</option>
                            {drivers.map(d => (
                                <option key={d.Email} value={d.Email}>
                                    {d.TransportirName || d.DisplayName} ({d.Email})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-1">
                        <label className="block text-xs font-medium text-slate-400">Catatan (opsional)</label>
                        <textarea
                            value={note}
                            onChange={e => setNote(e.target.value)}
                            rows={2}
                            placeholder="Instruksi atau catatan untuk driver…"
                            className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white outline-none resize-none focus:border-sky-400/40 transition"
                        />
                    </div>

                    <div className="flex justify-between gap-3">
                        {order.assignmentId && (
                            <button type="button" onClick={handleRemove} disabled={saving}
                                className="rounded-xl border border-red-400/30 px-4 py-2 text-sm text-red-400 hover:bg-red-400/10 disabled:opacity-50 transition">
                                Hapus Alokasi
                            </button>
                        )}
                        <div className="ml-auto flex gap-3">
                            <button type="button" onClick={onClose}
                                className="rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-400 hover:text-white transition">
                                Batal
                            </button>
                            <button type="submit" disabled={saving}
                                className="rounded-xl bg-sky-500 px-5 py-2 text-sm font-semibold text-white hover:bg-sky-400 disabled:opacity-50 transition">
                                {saving ? 'Menyimpan…' : 'Alokasikan'}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}

const STATUS_OPTIONS = ['', 'pending', 'processing', 'on_delivery', 'delivered', 'cancelled'];

export default function AlokasiSopir({ user }) {
    const [data,         setData]         = useState(null);
    const [drivers,      setDrivers]      = useState([]);
    const [loading,      setLoading]      = useState(true);
    const [error,        setError]        = useState(null);
    const [page,         setPage]         = useState(1);
    const [search,       setSearch]       = useState('');
    const [status,       setStatus]       = useState('');
    const [query,        setQuery]        = useState({});
    const [assignTarget, setAssignTarget] = useState(null);

    const fetch = useCallback(() => {
        setLoading(true);
        api.get('/driver-assignments', { page, ...query })
            .then(setData)
            .catch(e => setError(e.message))
            .finally(() => setLoading(false));
    }, [page, query]);

    useEffect(() => { fetch(); }, [fetch]);

    useEffect(() => {
        api.get('/app-users/transportir', { per_page: 200 })
            .then(d => setDrivers(d?.data ?? []))
            .catch(() => {});
    }, []);

    function handleSearch(e) {
        e.preventDefault();
        setPage(1);
        setQuery({ search, status });
    }

    const columns = [
        { key: 'poNumber',    label: 'PO Number',  render: r => <span className="font-mono text-xs">{r.poNumber}</span> },
        { key: 'userEmail',   label: 'Kiosk',      render: r => <span className="truncate max-w-[140px] block">{r.userEmail}</span> },
        { key: 'status',      label: 'Status',     render: r => <StatusBadge value={r.status} /> },
        { key: 'createdAt',   label: 'Tanggal',    render: r => formatDate(r.createdAt) },
        {
            key: 'driver', label: 'Driver',
            render: r => r.transportirEmail
                ? <span className="text-sky-300 text-xs">{r.transportirEmail}</span>
                : <span className="text-slate-500 italic text-xs">Belum dialokasikan</span>,
        },
        {
            key: '_act', label: '',
            render: r => (
                <button
                    onClick={() => setAssignTarget(r)}
                    className="rounded-lg border border-sky-400/30 bg-sky-400/10 px-3 py-1.5 text-xs font-medium text-sky-300 hover:bg-sky-400/20 transition"
                >
                    {r.transportirEmail ? 'Ubah' : 'Alokasikan'}
                </button>
            ),
        },
    ];

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-semibold text-white">Alokasi Sopir</h1>
                <p className="mt-1 text-sm text-slate-500">
                    Tetapkan driver untuk setiap order pengiriman.
                </p>
            </div>

            <form onSubmit={handleSearch} className="flex flex-wrap gap-3">
                <div className="relative flex-1 min-w-[200px]">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input type="text" placeholder="Cari PO number atau email…"
                        value={search} onChange={e => setSearch(e.target.value)}
                        className="w-full rounded-xl border border-white/10 bg-slate-950/50 pl-9 pr-4 py-2.5 text-sm text-white placeholder-slate-600 outline-none focus:border-sky-400/30 transition" />
                </div>
                <select value={status} onChange={e => setStatus(e.target.value)}
                    className="rounded-xl border border-white/10 bg-slate-950/50 px-3 py-2.5 text-sm text-slate-300 outline-none focus:border-sky-400/30 transition">
                    {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s || 'Semua status'}</option>)}
                </select>
                <button type="submit"
                    className="rounded-xl bg-sky-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-400 transition">
                    Cari
                </button>
            </form>

            {error && (
                <div className="rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-300">{error}</div>
            )}

            <Table
                columns={columns}
                data={data?.data}
                loading={loading}
                emptyMessage="Tidak ada order ditemukan."
            />
            <Pagination meta={data} onPageChange={setPage} />

            {assignTarget && (
                <AssignModal
                    order={assignTarget}
                    drivers={drivers}
                    onClose={() => setAssignTarget(null)}
                    onSaved={fetch}
                />
            )}
        </div>
    );
}
