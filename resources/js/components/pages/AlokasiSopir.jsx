import { Package, Pencil, Plus, Search, Trash2, Truck, X } from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';
import { api } from '../../api/client';
import { OrderStatusBadge, PaymentStatusBadge } from '../ui/StatusBadge';
import { Pagination, Table } from '../ui/Table';

function formatDate(val) {
    if (!val) return '—';
    return new Date(val).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatTon(val) {
    const n = Number(val ?? 0);
    return `${Number.isInteger(n) ? n : n.toFixed(2)} ton`;
}

function productLabel(items, productId) {
    const item = items.find(it => it.product_id === productId);
    if (!item) return `Produk #${productId}`;
    return item.product_code ? `${item.product_code} — ${item.product_name}` : item.product_name;
}

const SHIPMENT_STATUS_LABEL = {
    siap_muat:        'Siap Muat',
    dalam_perjalanan: 'Dalam Perjalanan',
    selesai:          'Selesai',
};

const ALLOCATION_STATUS_LABEL = {
    belum_dialokasikan: 'Belum Dialokasikan',
    sebagian:           'Sebagian',
    penuh:              'Penuh',
};

const ALLOCATION_STATUS_CLASS = {
    belum_dialokasikan: 'border-slate-500/25 bg-slate-500/10 text-slate-400',
    sebagian:           'border-amber-400/25 bg-amber-400/10 text-amber-300',
    penuh:               'border-emerald-400/25 bg-emerald-400/10 text-emerald-300',
};

function AllocationStatusBadge({ value }) {
    return (
        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${ALLOCATION_STATUS_CLASS[value] ?? ALLOCATION_STATUS_CLASS.belum_dialokasikan}`}>
            {ALLOCATION_STATUS_LABEL[value] ?? value}
        </span>
    );
}

// Form tambah slot truk baru (produk sudah ditentukan dari baris yang diklik) atau
// edit slot yang sudah ada (produk tidak bisa diubah, hanya tonase/sopir/catatan).
function SlotForm({ orderId, item, slot, drivers, onCancel, onSaved }) {
    const isEdit = Boolean(slot);
    const maxTon = isEdit ? (item?.remaining_ton ?? 0) + Number(slot.quotaTon) : (item?.remaining_ton ?? 0);

    const [quotaTon,  setQuotaTon]  = useState(slot ? String(slot.quotaTon) : '');
    const [driver,    setDriver]    = useState(slot?.transportirEmail ?? '');
    const [note,      setNote]      = useState(slot?.note ?? '');
    const [saving,    setSaving]    = useState(false);
    const [error,     setError]     = useState(null);

    async function handleSubmit(e) {
        e.preventDefault();
        const qty = parseFloat(quotaTon);
        if (!qty || qty <= 0) { setError('Tonase wajib diisi.'); return; }
        if (!driver) { setError('Pilih sopir terlebih dahulu.'); return; }
        setSaving(true);
        setError(null);
        try {
            if (isEdit) {
                await api.put(`/shipments/${slot.id}`, {
                    quota_ton:         qty,
                    transportir_email: driver,
                    note,
                });
            } else {
                await api.post('/shipments', {
                    order_id:          orderId,
                    product_id:        item.product_id,
                    quota_ton:         qty,
                    transportir_email: driver,
                    note,
                });
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
            {!isEdit && (
                <p className="text-sm text-white">
                    Produk: <span className="font-medium">{item.product_code ? `${item.product_code} — ` : ''}{item.product_name}</span>
                    <span className="ml-2 text-xs text-slate-400">(sisa {formatTon(item.remaining_ton)})</span>
                </p>
            )}
            {error && (
                <div className="rounded-lg border border-red-400/20 bg-red-400/10 px-3 py-2 text-xs text-red-300">{error}</div>
            )}
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
                            {d.TransportirName || d.DisplayName} ({d.Email}) — {d.Type || 'truk tidak diketahui'}
                        </option>
                    ))}
                </select>
            </div>
            <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-400">Catatan (opsional)</label>
                <textarea
                    value={note} onChange={e => setNote(e.target.value)} rows={2}
                    placeholder="Instruksi atau catatan untuk sopir…"
                    className="w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white outline-none resize-none focus:border-sky-400/40 transition"
                />
            </div>
            <div className="flex justify-end gap-2">
                <button type="button" onClick={onCancel}
                    className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-slate-400 hover:text-white transition">
                    Batal
                </button>
                <button type="submit" disabled={saving}
                    className="rounded-lg bg-sky-500 px-4 py-1.5 text-xs font-semibold text-white hover:bg-sky-400 disabled:opacity-50 transition">
                    {saving ? 'Menyimpan…' : isEdit ? 'Simpan Perubahan' : 'Tambahkan'}
                </button>
            </div>
        </form>
    );
}

function AllocationModal({ order, drivers, onClose, onSaved }) {
    const [detail,  setDetail]  = useState(null);
    const [loading, setLoading] = useState(true);
    const [error,   setError]   = useState(null);
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

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={onClose} />
            <div className="relative z-10 w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-white/10 bg-slate-900 shadow-2xl">
                <div className="flex items-center justify-between border-b border-white/8 px-6 py-4">
                    <div>
                        <h2 className="flex items-center gap-2 text-base font-semibold text-white">
                            <Truck size={16} className="text-sky-400" />
                            Alokasi Sopir
                        </h2>
                        <p className="mt-0.5 font-mono text-xs text-slate-400">{order.poNumber} · {detail?.order?.kioskName || order.userEmail}</p>
                    </div>
                    <button onClick={onClose} className="rounded-lg p-1 text-slate-500 hover:text-white transition"><X size={18} /></button>
                </div>

                <div className="space-y-6 px-6 py-5">
                    {isOrderClosed && (
                        <div className="rounded-xl border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-300">
                            Order sudah {orderStatus === 'delivered' ? 'selesai' : 'dibatalkan'} — alokasi tidak bisa ditambah/diubah lagi.
                        </div>
                    )}

                    {error && (
                        <div className="rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-300">{error}</div>
                    )}

                    {loading ? (
                        <div className="space-y-2">
                            {[...Array(3)].map((_, i) => <div key={i} className="h-12 animate-pulse rounded-xl bg-white/5" />)}
                        </div>
                    ) : (
                        <>
                            <div>
                                <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                                    <Package size={13} /> Rincian Produk
                                </h3>
                                <div className="overflow-hidden rounded-xl border border-white/8">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b border-white/8 bg-white/4">
                                                {['Produk', 'Dijatah', 'Teralokasi', 'Sisa', ''].map(h => (
                                                    <th key={h} className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">{h}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5">
                                            {items.map(it => (
                                                <React.Fragment key={it.product_id}>
                                                    <tr>
                                                        <td className="px-3 py-2.5 text-slate-200">
                                                            {it.product_code ? <span className="font-mono text-xs text-slate-500">{it.product_code}</span> : null}
                                                            <span className="ml-1">{it.product_name}</span>
                                                        </td>
                                                        <td className="px-3 py-2.5 text-slate-300">{formatTon(it.purchased_ton)}</td>
                                                        <td className="px-3 py-2.5 text-slate-300">{formatTon(it.allocated_ton)}</td>
                                                        <td className="px-3 py-2.5">
                                                            <span className={it.remaining_ton > 0.01 ? 'text-amber-300' : 'text-emerald-300'}>{formatTon(it.remaining_ton)}</span>
                                                        </td>
                                                        <td className="px-3 py-2.5 text-right">
                                                            {!isOrderClosed && it.remaining_ton > 0.01 && addingForProduct !== it.product_id && (
                                                                <button
                                                                    onClick={() => { setAddingForProduct(it.product_id); setEditingSlotId(null); }}
                                                                    className="inline-flex items-center gap-1 rounded-lg border border-sky-400/30 bg-sky-400/10 px-2.5 py-1 text-xs font-medium text-sky-300 hover:bg-sky-400/20 transition"
                                                                >
                                                                    <Plus size={12} /> Tambah
                                                                </button>
                                                            )}
                                                        </td>
                                                    </tr>
                                                    {addingForProduct === it.product_id && (
                                                        <tr>
                                                            <td colSpan={5} className="px-3 py-3">
                                                                <SlotForm
                                                                    orderId={order.id}
                                                                    item={it}
                                                                    drivers={drivers}
                                                                    onCancel={() => setAddingForProduct(null)}
                                                                    onSaved={handleChanged}
                                                                />
                                                            </td>
                                                        </tr>
                                                    )}
                                                </React.Fragment>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            <div>
                                <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                                    <Truck size={13} /> Truk &amp; Sopir
                                </h3>

                                {shipments.length === 0 && (
                                    <p className="text-sm italic text-slate-500">Belum ada truk dialokasikan.</p>
                                )}

                                <div className="space-y-3">
                                    {shipments.map((s, index) => (
                                        <div key={s.id} className="rounded-xl border border-white/8 bg-white/3 p-4">
                                            {editingSlotId === s.id ? (
                                                <SlotForm
                                                    orderId={order.id}
                                                    item={items.find(it => it.product_id === s.productId)}
                                                    slot={s}
                                                    drivers={drivers}
                                                    onCancel={() => setEditingSlotId(null)}
                                                    onSaved={handleChanged}
                                                />
                                            ) : (
                                                <>
                                                    <div className="mb-2 flex items-center justify-between gap-3">
                                                        <p className="text-sm font-semibold text-white">
                                                            Truk {index + 1} — {productLabel(items, s.productId)} ({formatTon(s.quotaTon)})
                                                        </p>
                                                        <span className="shrink-0 rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-xs text-slate-300">
                                                            {SHIPMENT_STATUS_LABEL[s.status] ?? s.status}
                                                        </span>
                                                    </div>
                                                    <dl className="space-y-1 text-xs">
                                                        <div className="flex gap-2"><dt className="text-slate-500">Sopir</dt><dd className="text-slate-300">{s.driverName} ({s.transportirEmail})</dd></div>
                                                        <div className="flex gap-2"><dt className="text-slate-500">Kendaraan</dt><dd className="text-slate-300">{s.truckLabel ?? '—'} {s.policeNumber ? `(${s.policeNumber})` : ''}</dd></div>
                                                        {s.note && <div className="flex gap-2"><dt className="text-slate-500">Catatan</dt><dd className="text-slate-300">{s.note}</dd></div>}
                                                        {s.muatInAt && <div className="flex gap-2"><dt className="text-slate-500">Load-In</dt><dd className="text-slate-300">{formatDate(s.muatInAt)}</dd></div>}
                                                        {s.muatOutAt && <div className="flex gap-2"><dt className="text-slate-500">Load-Out</dt><dd className="text-slate-300">{formatDate(s.muatOutAt)}</dd></div>}
                                                    </dl>

                                                    {!s.locked && (
                                                        <div className="mt-3 flex gap-2">
                                                            <button
                                                                onClick={() => { setEditingSlotId(s.id); setAddingForProduct(null); }}
                                                                className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-2.5 py-1 text-xs text-slate-300 hover:text-white transition"
                                                            >
                                                                <Pencil size={12} /> Ubah
                                                            </button>
                                                            <button
                                                                onClick={() => handleDelete(s.id)}
                                                                disabled={deletingId === s.id}
                                                                className="inline-flex items-center gap-1 rounded-lg border border-red-400/30 px-2.5 py-1 text-xs text-red-400 hover:bg-red-400/10 disabled:opacity-50 transition"
                                                            >
                                                                <Trash2 size={12} /> {deletingId === s.id ? 'Menghapus…' : 'Hapus'}
                                                            </button>
                                                        </div>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}
                </div>

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
        { key: 'poNumber',    label: 'PO Number',  render: r => <span className="font-mono text-xs">{r.poNumber}</span> },
        { key: 'userEmail',   label: 'Kiosk',      render: r => <span className="truncate max-w-[140px] block">{r.userEmail}</span> },
        { key: 'paymentStatus', label: 'Pembayaran', render: r => <PaymentStatusBadge value={r.paymentStatus} /> },
        { key: 'orderStatus', label: 'Status',     render: r => <OrderStatusBadge value={r.orderStatus} /> },
        { key: 'createdAt',   label: 'Tanggal',    render: r => formatDate(r.createdAt) },
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
