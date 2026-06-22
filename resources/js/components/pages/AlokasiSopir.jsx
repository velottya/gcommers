import { Search, Trash2, UserCheck, X } from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';
import { api } from '../../api/client';
import { OrderStatusBadge, PaymentStatusBadge } from '../ui/StatusBadge';
import { Pagination, Table } from '../ui/Table';

function formatDate(val) {
    if (!val) return '—';
    return new Date(val).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

const SHIPMENT_STATUS_LABEL = {
    siap_muat:        'Siap Muat',
    dalam_perjalanan: 'Dalam Perjalanan',
    selesai:          'Selesai',
};

function AssignModal({ order, drivers, warehouses, onClose, onSaved }) {
    const [selectedDriver,    setSelectedDriver]    = useState(order.transportirEmail ?? '');
    const [selectedWarehouse, setSelectedWarehouse] = useState('');
    const [note,    setNote]    = useState(order.note ?? '');
    const [saving,  setSaving]  = useState(false);
    const [error,   setError]   = useState(null);

    const alreadyAssigned = Boolean(order.shipmentId);
    const isLocked = order.shipmentStatus && order.shipmentStatus !== 'siap_muat';

    async function handleSubmit(e) {
        e.preventDefault();
        if (!selectedDriver) { setError('Pilih sopir terlebih dahulu.'); return; }
        if (!selectedWarehouse) { setError('Pilih gudang asal terlebih dahulu.'); return; }
        setSaving(true);
        setError(null);
        try {
            await api.post('/shipments', {
                order_id: order.id,
                transportir_email: selectedDriver,
                warehouse_id: selectedWarehouse,
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
        setSaving(true);
        setError(null);
        try {
            await api.del(`/shipments/${order.id}`);
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

                    {isLocked && (
                        <div className="rounded-xl border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-300">
                            Pengiriman sudah berjalan ({SHIPMENT_STATUS_LABEL[order.shipmentStatus]}) — alokasi tidak bisa diubah lagi.
                        </div>
                    )}

                    {error && (
                        <div className="rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-300">{error}</div>
                    )}

                    <div className="space-y-1">
                        <label className="block text-xs font-medium text-slate-400">Pilih Sopir</label>
                        <select
                            value={selectedDriver}
                            onChange={e => setSelectedDriver(e.target.value)}
                            disabled={isLocked}
                            className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-sky-400/40 transition disabled:opacity-50"
                        >
                            <option value="">— Pilih sopir —</option>
                            {drivers.map(d => (
                                <option key={d.Email} value={d.Email}>
                                    {d.TransportirName || d.DisplayName} ({d.Email}) — {d.Type || 'truk tidak diketahui'}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-1">
                        <label className="block text-xs font-medium text-slate-400">Gudang Asal (Terdekat)</label>
                        <select
                            value={selectedWarehouse}
                            onChange={e => setSelectedWarehouse(e.target.value)}
                            disabled={isLocked}
                            className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-sky-400/40 transition disabled:opacity-50"
                        >
                            <option value="">— Pilih gudang —</option>
                            {warehouses.map(w => (
                                <option key={w.id} value={w.id}>{w.name} — {w.address}</option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-1">
                        <label className="block text-xs font-medium text-slate-400">Catatan (opsional)</label>
                        <textarea
                            value={note}
                            onChange={e => setNote(e.target.value)}
                            rows={2}
                            disabled={isLocked}
                            placeholder="Instruksi atau catatan untuk sopir…"
                            className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white outline-none resize-none focus:border-sky-400/40 transition disabled:opacity-50"
                        />
                    </div>

                    <div className="flex justify-between gap-3">
                        {alreadyAssigned && !isLocked && (
                            <button type="button" onClick={handleRemove} disabled={saving}
                                className="flex items-center gap-1.5 rounded-xl border border-red-400/30 px-4 py-2 text-sm text-red-400 hover:bg-red-400/10 disabled:opacity-50 transition">
                                <Trash2 size={14} />
                                Hapus Alokasi
                            </button>
                        )}
                        <div className="ml-auto flex gap-3">
                            <button type="button" onClick={onClose}
                                className="rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-400 hover:text-white transition">
                                Tutup
                            </button>
                            {!isLocked && (
                                <button type="submit" disabled={saving}
                                    className="rounded-xl bg-sky-500 px-5 py-2 text-sm font-semibold text-white hover:bg-sky-400 disabled:opacity-50 transition">
                                    {saving ? 'Menyimpan…' : alreadyAssigned ? 'Simpan Perubahan' : 'Alokasikan'}
                                </button>
                            )}
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default function AlokasiSopir() {
    const [data,         setData]         = useState(null);
    const [drivers,      setDrivers]      = useState([]);
    const [warehouses,   setWarehouses]   = useState([]);
    const [loading,      setLoading]      = useState(true);
    const [error,        setError]        = useState(null);
    const [page,         setPage]         = useState(1);
    const [search,       setSearch]       = useState('');
    const [query,        setQuery]        = useState({});
    const [assignTarget, setAssignTarget] = useState(null);

    const fetchOrders = useCallback(() => {
        setLoading(true);
        api.get('/shipments', { page, ...query })
            .then(setData)
            .catch(e => setError(e.message))
            .finally(() => setLoading(false));
    }, [page, query]);

    useEffect(() => { fetchOrders(); }, [fetchOrders]);

    useEffect(() => {
        api.get('/app-users/transportir', { per_page: 200 })
            .then(d => setDrivers(d?.data ?? []))
            .catch(() => {});
        api.get('/warehouses')
            .then(setWarehouses)
            .catch(() => {});
    }, []);

    function handleSearch(e) {
        e.preventDefault();
        setPage(1);
        setQuery({ search });
    }

    const columns = [
        { key: 'poNumber',    label: 'PO Number',  render: r => <span className="font-mono text-xs">{r.poNumber}</span> },
        { key: 'userEmail',   label: 'Kiosk',      render: r => <span className="truncate max-w-[140px] block">{r.userEmail}</span> },
        { key: 'paymentStatus', label: 'Pembayaran', render: r => <PaymentStatusBadge value={r.paymentStatus} /> },
        { key: 'orderStatus', label: 'Status',     render: r => <OrderStatusBadge value={r.orderStatus} /> },
        { key: 'createdAt',   label: 'Tanggal',    render: r => formatDate(r.createdAt) },
        {
            key: 'driver', label: 'Sopir / Gudang',
            render: r => r.transportirEmail
                ? (
                    <div className="text-xs">
                        <p className="text-sky-300">{r.driverName || r.transportirEmail}</p>
                        <p className="text-slate-500">{r.warehouseName ?? '—'}</p>
                    </div>
                )
                : <span className="text-slate-500 italic text-xs">Belum dialokasikan</span>,
        },
        {
            key: '_act', label: '',
            render: r => (
                <button
                    onClick={() => setAssignTarget(r)}
                    className="rounded-lg border border-sky-400/30 bg-sky-400/10 px-3 py-1.5 text-xs font-medium text-sky-300 hover:bg-sky-400/20 transition"
                >
                    {r.transportirEmail ? 'Lihat / Ubah' : 'Alokasikan'}
                </button>
            ),
        },
    ];

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-semibold text-white">Alokasi Sopir</h1>
                <p className="mt-1 text-sm text-slate-500">
                    Tetapkan sopir &amp; gudang asal untuk setiap order yang sudah dibayar.
                </p>
            </div>

            <form onSubmit={handleSearch} className="flex flex-wrap gap-3">
                <div className="relative flex-1 min-w-[200px]">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input type="text" placeholder="Cari PO number atau email…"
                        value={search} onChange={e => setSearch(e.target.value)}
                        className="w-full rounded-xl border border-white/10 bg-slate-950/50 pl-9 pr-4 py-2.5 text-sm text-white placeholder-slate-600 outline-none focus:border-sky-400/30 transition" />
                </div>
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
                    warehouses={warehouses}
                    onClose={() => setAssignTarget(null)}
                    onSaved={fetchOrders}
                />
            )}
        </div>
    );
}
