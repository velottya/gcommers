import { MapPin, Pencil, Plus, Search, Trash2, Truck, Warehouse, X } from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';
import { api } from '../../api/client';
import { OrderStatusBadge } from '../ui/StatusBadge';
import { Pagination, Table } from '../ui/Table';

function formatDate(val) {
    if (!val) return '—';
    return new Date(val).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatTon(val) {
    const n = Number(val ?? 0);
    return `${Number.isInteger(n) ? n : n.toFixed(2)} ton`;
}

const SHIPMENT_STATUS_LABEL = {
    siap_muat:        'Siap Muat',
    dalam_perjalanan: 'Dalam Perjalanan',
    selesai:          'Selesai',
};

const ALLOCATION_STATUS_CLASS = {
    belum_dialokasikan: 'border-slate-500/25 bg-slate-500/10 text-slate-400',
    sebagian:           'border-amber-400/25 bg-amber-400/10 text-amber-300',
    penuh:              'border-emerald-400/25 bg-emerald-400/10 text-emerald-300',
};

const ALLOCATION_STATUS_LABEL = {
    belum_dialokasikan: 'Belum Dialokasikan',
    sebagian:           'Sebagian',
    penuh:              'Penuh',
};

function AllocationStatusBadge({ value }) {
    return (
        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${ALLOCATION_STATUS_CLASS[value] ?? ALLOCATION_STATUS_CLASS.belum_dialokasikan}`}>
            {ALLOCATION_STATUS_LABEL[value] ?? value}
        </span>
    );
}

function SlotForm({ orderId, item, slot, drivers, onCancel, onSaved }) {
    const isEdit = Boolean(slot);
    const maxTon = isEdit ? (item?.remaining_ton ?? 0) + Number(slot.quotaTon) : (item?.remaining_ton ?? 0);

    const [quotaTon, setQuotaTon] = useState(slot ? String(slot.quotaTon) : '');
    const [driver,   setDriver]   = useState(slot?.transportirEmail ?? '');
    const [note,     setNote]     = useState(slot?.note ?? '');
    const [saving,   setSaving]   = useState(false);
    const [error,    setError]    = useState(null);

    async function handleSubmit(e) {
        e.preventDefault();
        const qty = parseFloat(quotaTon);
        if (!qty || qty <= 0) { setError('Tonase wajib diisi.'); return; }
        if (!driver) { setError('Pilih sopir terlebih dahulu.'); return; }
        setSaving(true);
        setError(null);
        try {
            if (isEdit) {
                await api.put(`/shipments/${slot.id}`, { quota_ton: qty, transportir_email: driver, note });
            } else {
                await api.post('/shipments', { order_id: orderId, product_id: item.product_id, quota_ton: qty, transportir_email: driver, note });
            }
            onSaved();
        } catch (err) {
            setError(err.message || 'Gagal menyimpan.');
        } finally {
            setSaving(false);
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-3 rounded-xl border border-sky-400/20 bg-sky-400/5 p-4">
            {error && (
                <div className="rounded-lg border border-red-400/20 bg-red-400/10 px-3 py-2 text-xs text-red-300">{error}</div>
            )}
            <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                    <label className="block text-xs font-medium text-slate-400">Tonase (ton)</label>
                    <input
                        type="number" min="0.01" step="0.01" max={maxTon || undefined}
                        value={quotaTon} onChange={e => setQuotaTon(e.target.value)}
                        placeholder={`maks. ${formatTon(maxTon)}`}
                        className="w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-sky-400/40 transition"
                    />
                </div>
                <div className="space-y-1">
                    <label className="block text-xs font-medium text-slate-400">Sopir</label>
                    <select
                        value={driver} onChange={e => setDriver(e.target.value)}
                        className="w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-sky-400/40 transition"
                    >
                        <option value="">— Pilih sopir —</option>
                        {drivers.map(d => (
                            <option key={d.Email} value={d.Email}>
                                {d.TransportirName || d.DisplayName} — {d.Type || 'truk'}
                            </option>
                        ))}
                    </select>
                </div>
            </div>
            <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-400">Catatan (opsional)</label>
                <input type="text" value={note} onChange={e => setNote(e.target.value)}
                    placeholder="Instruksi atau catatan untuk sopir…"
                    className="w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-sky-400/40 transition"
                />
            </div>
            <div className="flex justify-end gap-2">
                <button type="button" onClick={onCancel}
                    className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-slate-400 hover:text-white transition">
                    Batal
                </button>
                <button type="submit" disabled={saving}
                    className="rounded-lg bg-sky-500 px-4 py-1.5 text-xs font-semibold text-white hover:bg-sky-400 disabled:opacity-50 transition">
                    {saving ? 'Menyimpan…' : isEdit ? 'Simpan' : 'Tambahkan'}
                </button>
            </div>
        </form>
    );
}

function RouteInfo({ order, gudang }) {
    const hasGudang = gudang?.length > 0;
    const hasKiosk  = order?.kioskName || order?.kioskAddress;
    if (!hasGudang && !hasKiosk) return null;

    return (
        <div className="rounded-xl border border-white/8 bg-white/3 p-4">
            <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Rute Pengiriman</p>
            <div className="grid grid-cols-2 gap-3">
                {/* Gudang - titik muat */}
                <div className="rounded-lg border border-teal-400/15 bg-teal-400/5 p-3">
                    <div className="mb-2 flex items-center gap-1.5">
                        <Warehouse size={12} className="text-teal-400 shrink-0" />
                        <span className="text-[9.5px] font-bold uppercase tracking-[0.12em] text-teal-400">Gudang (Muat)</span>
                    </div>
                    {hasGudang ? (
                        gudang.map((g, i) => (
                            <div key={i} className={i > 0 ? 'mt-2 pt-2 border-t border-white/8' : ''}>
                                <p className="text-xs font-semibold text-white">{g.nama_gudang}</p>
                                {g.alamat && (
                                    <div className="mt-1 flex items-start gap-1">
                                        <MapPin size={10} className="text-slate-500 shrink-0 mt-0.5" />
                                        <p className="text-[11px] text-slate-400 leading-relaxed">{g.alamat}</p>
                                    </div>
                                )}
                                {g.nama_pic && (
                                    <p className="mt-1 text-[11px] text-slate-500">PIC: {g.nama_pic}{g.no_telp ? ` · ${g.no_telp}` : ''}</p>
                                )}
                            </div>
                        ))
                    ) : (
                        <p className="text-[11px] text-slate-500 italic">Belum ada gudang aktif di wilayah ini.</p>
                    )}
                </div>

                {/* Kiosk - tujuan */}
                <div className="rounded-lg border border-sky-400/15 bg-sky-400/5 p-3">
                    <div className="mb-2 flex items-center gap-1.5">
                        <Truck size={12} className="text-sky-400 shrink-0" />
                        <span className="text-[9.5px] font-bold uppercase tracking-[0.12em] text-sky-400">Kiosk (Tujuan)</span>
                    </div>
                    <p className="text-xs font-semibold text-white">{order?.kioskName || '—'}</p>
                    {order?.kioskAddress ? (
                        <div className="mt-1 flex items-start gap-1">
                            <MapPin size={10} className="text-slate-500 shrink-0 mt-0.5" />
                            <p className="text-[11px] text-slate-400 leading-relaxed">{order.kioskAddress}</p>
                        </div>
                    ) : (
                        <p className="mt-1 text-[11px] text-slate-500 italic">Alamat tidak tersedia.</p>
                    )}
                </div>
            </div>
        </div>
    );
}

function AllocationModal({ order, drivers, onClose, onSaved }) {
    const [detail,           setDetail]           = useState(null);
    const [loading,          setLoading]          = useState(true);
    const [error,            setError]            = useState(null);
    const [editingSlotId,    setEditingSlotId]    = useState(null);
    const [addingForProduct, setAddingForProduct] = useState(null);
    const [deletingId,       setDeletingId]       = useState(null);

    const load = useCallback(() => {
        setLoading(true);
        api.get(`/shipments/order/${order.id}`)
            .then(setDetail)
            .catch(e => setError(e.message))
            .finally(() => setLoading(false));
    }, [order.id]);

    useEffect(() => { load(); }, [load]);

    function handleChanged() {
        setEditingSlotId(null);
        setAddingForProduct(null);
        load();
        onSaved();
    }

    async function handleDelete(shipmentId) {
        if (!window.confirm('Hapus alokasi truk ini?')) return;
        setDeletingId(shipmentId);
        setError(null);
        try {
            await api.del(`/shipments/${shipmentId}`);
            handleChanged();
        } catch (err) {
            setError(err.message || 'Gagal menghapus alokasi.');
        } finally {
            setDeletingId(null);
        }
    }

    const items     = detail?.items ?? [];
    const shipments = detail?.shipments ?? [];
    const orderStatus = detail?.order?.orderStatus ?? order.orderStatus;
    const isOrderClosed = ['delivered', 'cancelled'].includes(orderStatus);
    const kioskName = detail?.order?.kioskName || order.kioskName || order.userEmail;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={onClose} />
            <div className="relative z-10 w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl border border-white/10 bg-slate-900 shadow-2xl">

                {/* Header */}
                <div className="flex items-center justify-between border-b border-white/8 px-6 py-4">
                    <div>
                        <p className="font-mono text-xs text-slate-500">{order.poNumber}</p>
                        <h2 className="flex items-center gap-2 text-base font-semibold text-white">
                            <Truck size={15} className="text-sky-400 shrink-0" />
                            {kioskName}
                        </h2>
                    </div>
                    <button onClick={onClose} className="rounded-lg p-1 text-slate-500 hover:text-white transition">
                        <X size={18} />
                    </button>
                </div>

                {/* Body */}
                <div className="space-y-4 px-6 py-5">
                    {isOrderClosed && (
                        <div className="rounded-xl border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-300">
                            Order sudah {orderStatus === 'delivered' ? 'selesai' : 'dibatalkan'} — alokasi tidak bisa ditambah/diubah lagi.
                        </div>
                    )}

                    {!loading && <RouteInfo order={detail?.order} gudang={detail?.order?.gudang} />}

                    {error && (
                        <div className="rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-300">{error}</div>
                    )}

                    {loading ? (
                        <div className="space-y-3">
                            {[...Array(2)].map((_, i) => <div key={i} className="h-24 animate-pulse rounded-xl bg-white/5" />)}
                        </div>
                    ) : items.length === 0 ? (
                        <p className="text-sm italic text-slate-500">Tidak ada produk yang dijatah ke perusahaan ini.</p>
                    ) : (
                        items.map(item => {
                            const truckSlots = shipments.filter(s => s.productId === item.product_id);
                            const isFull = item.remaining_ton <= 0.01;

                            return (
                                <div key={item.product_id} className="rounded-xl border border-white/8 overflow-hidden">
                                    {/* Product header */}
                                    <div className="flex items-center justify-between bg-white/4 px-4 py-3">
                                        <div>
                                            <p className="text-sm font-semibold text-white">
                                                {item.product_code && (
                                                    <span className="font-mono text-xs text-slate-400 mr-1.5">{item.product_code}</span>
                                                )}
                                                {item.product_name}
                                            </p>
                                            <p className="mt-0.5 text-xs text-slate-400">
                                                {formatTon(item.allocated_ton)} / {formatTon(item.purchased_ton)} teralokasi
                                            </p>
                                        </div>
                                        <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-medium ${isFull ? 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300' : 'border-amber-400/20 bg-amber-400/10 text-amber-300'}`}>
                                            {isFull ? 'Penuh' : `Sisa ${formatTon(item.remaining_ton)}`}
                                        </span>
                                    </div>

                                    {/* Truck rows */}
                                    <div className="divide-y divide-white/5">
                                        {truckSlots.length === 0 && addingForProduct !== item.product_id && (
                                            <p className="px-4 py-3 text-xs italic text-slate-500">Belum ada truk dialokasikan.</p>
                                        )}

                                        {truckSlots.map((s, idx) => (
                                            editingSlotId === s.id ? (
                                                <div key={s.id} className="px-4 py-3">
                                                    <SlotForm
                                                        orderId={order.id}
                                                        item={item}
                                                        slot={s}
                                                        drivers={drivers}
                                                        onCancel={() => setEditingSlotId(null)}
                                                        onSaved={handleChanged}
                                                    />
                                                </div>
                                            ) : (
                                                <div key={s.id} className="flex items-center gap-3 px-4 py-3">
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-medium text-white truncate">
                                                            {s.driverName}
                                                            <span className="ml-1.5 text-xs font-normal text-slate-400">{formatTon(s.quotaTon)}</span>
                                                        </p>
                                                        <p className="text-xs text-slate-500 truncate">
                                                            {s.truckLabel || '—'}
                                                            {s.note ? ` · ${s.note}` : ''}
                                                        </p>
                                                    </div>
                                                    <span className="shrink-0 text-xs text-slate-400">
                                                        {SHIPMENT_STATUS_LABEL[s.status] ?? s.status}
                                                    </span>
                                                    {!s.locked && !isOrderClosed && (
                                                        <div className="flex shrink-0 gap-1">
                                                            <button
                                                                onClick={() => { setEditingSlotId(s.id); setAddingForProduct(null); }}
                                                                className="rounded-lg p-1.5 text-slate-500 hover:text-sky-400 hover:bg-sky-400/10 transition"
                                                                title="Ubah"
                                                            >
                                                                <Pencil size={13} />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDelete(s.id)}
                                                                disabled={deletingId === s.id}
                                                                className="rounded-lg p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-400/10 disabled:opacity-50 transition"
                                                                title="Hapus"
                                                            >
                                                                <Trash2 size={13} />
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            )
                                        ))}

                                        {addingForProduct === item.product_id ? (
                                            <div className="px-4 py-3">
                                                <SlotForm
                                                    orderId={order.id}
                                                    item={item}
                                                    drivers={drivers}
                                                    onCancel={() => setAddingForProduct(null)}
                                                    onSaved={handleChanged}
                                                />
                                            </div>
                                        ) : (!isFull && !isOrderClosed && (
                                            <button
                                                onClick={() => { setAddingForProduct(item.product_id); setEditingSlotId(null); }}
                                                className="flex w-full items-center gap-1.5 px-4 py-2.5 text-xs font-medium text-sky-400 hover:bg-sky-400/5 transition"
                                            >
                                                <Plus size={13} /> Tambah Truk
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Footer */}
                <div className="flex justify-end border-t border-white/8 px-6 py-4">
                    <button onClick={onClose}
                        className="rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-400 hover:text-white transition">
                        Tutup
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function AlokasiSopir() {
    const [data,           setData]           = useState(null);
    const [drivers,        setDrivers]        = useState([]);
    const [loading,        setLoading]        = useState(true);
    const [error,          setError]          = useState(null);
    const [page,           setPage]           = useState(1);
    const [search,         setSearch]         = useState('');
    const [query,          setQuery]          = useState({});
    const [allocateTarget, setAllocateTarget] = useState(null);

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
    }, []);

    function handleSearch(e) {
        e.preventDefault();
        setPage(1);
        setQuery({ search });
    }

    const columns = [
        { key: 'poNumber',    label: 'No Pesanan',  render: r => <span className="font-mono text-xs">{r.poNumber}</span> },
        { key: 'kioskName',   label: 'Kiosk',       render: r => <span className="truncate max-w-[160px] block">{r.kioskName || r.userEmail}</span> },
        { key: 'orderStatus', label: 'Status',      render: r => <OrderStatusBadge value={r.orderStatus} /> },
        { key: 'createdAt',   label: 'Tanggal',     render: r => formatDate(r.createdAt) },
        {
            key: 'alokasi', label: 'Alokasi',
            render: r => (
                <div className="space-y-1 text-xs">
                    <p className="text-slate-200">{r.slotCount} truk · {formatTon(r.allocatedTon)} / {formatTon(r.assignedTon)}</p>
                    <AllocationStatusBadge value={r.allocationStatus} />
                </div>
            ),
        },
        {
            key: '_act', label: '',
            render: r => (
                <button
                    onClick={() => setAllocateTarget(r)}
                    className="rounded-lg border border-sky-400/30 bg-sky-400/10 px-3 py-1.5 text-xs font-medium text-sky-300 hover:bg-sky-400/20 transition"
                >
                    Kelola Alokasi
                </button>
            ),
        },
    ];

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-semibold text-white">Alokasi Sopir</h1>
                <p className="mt-1 text-sm text-slate-500">
                    Pecah order menjadi beberapa truk, masing-masing membawa produk &amp; tonase tertentu.
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

            {allocateTarget && (
                <AllocationModal
                    order={allocateTarget}
                    drivers={drivers}
                    onClose={() => setAllocateTarget(null)}
                    onSaved={fetchOrders}
                />
            )}
        </div>
    );
}
