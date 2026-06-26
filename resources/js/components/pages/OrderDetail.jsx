import { ArrowLeft, Ban, Download, Plus, Truck, X } from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../../api/client';
import { GudangStatusBadge, OrderStatusBadge, PaymentStatusBadge } from '../ui/StatusBadge';

function formatRupiah(val) {
    if (val == null) return '—';
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);
}

function formatDate(val) {
    if (!val) return '—';
    return new Date(val).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
}

function formatDistance(meters) {
    if (meters == null) return '—';
    return meters >= 1000 ? `${(meters / 1000).toFixed(1)} km` : `${Math.round(meters)} m`;
}

function Section({ title, children }) {
    return (
        <div className="p-6">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">{title}</h2>
            {children}
        </div>
    );
}

function InfoRow({ label, value }) {
    return (
        <div className="flex flex-col gap-0.5 sm:flex-row sm:items-center sm:gap-4">
            <dt className="min-w-[140px] text-xs uppercase tracking-[0.2em] text-slate-500">{label}</dt>
            <dd className="text-sm text-slate-200">{value ?? '—'}</dd>
        </div>
    );
}

function CancelModal({ order, onClose, onCancelled }) {
    const [reason, setReason]   = useState('');
    const [saving, setSaving]   = useState(false);
    const [error,  setError]    = useState(null);

    async function handleSubmit(e) {
        e.preventDefault();
        if (!reason.trim()) { setError('Alasan pembatalan wajib diisi.'); return; }
        setSaving(true);
        setError(null);
        try {
            await api.post(`/orders/${order.id}/cancel`, { reason });
            onCancelled();
            onClose();
        } catch (err) {
            setError(err.message || 'Gagal membatalkan order.');
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={onClose} />
            <div className="relative z-10 w-full max-w-md rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl">
                <h2 className="text-base font-semibold text-white">Batalkan Pesanan?</h2>
                <p className="mt-2 text-sm text-slate-400">
                    Order <span className="font-mono text-white">{order.poNumber}</span> akan ditandai <span className="text-red-300">Dibatalkan</span>. Tindakan ini tidak dapat dibatalkan.
                </p>
                <form onSubmit={handleSubmit} className="mt-4 space-y-3">
                    <textarea
                        value={reason}
                        onChange={e => setReason(e.target.value)}
                        rows={3}
                        placeholder="Alasan pembatalan (wajib diisi)…"
                        className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white outline-none resize-none focus:border-red-400/40 transition"
                    />
                    {error && <p className="text-sm text-red-400">{error}</p>}
                    <div className="flex justify-end gap-3">
                        <button type="button" onClick={onClose}
                            className="rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-400 hover:text-white transition">
                            Batal
                        </button>
                        <button type="submit" disabled={saving}
                            className="rounded-xl bg-red-500 px-4 py-2 text-sm font-semibold text-white hover:bg-red-400 disabled:opacity-50 transition">
                            {saving ? 'Memproses…' : 'Ya, Batalkan Pesanan'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// Gudang asal pengiriman: AdminRegion memilih dari gudang yang disetujui di region
// order ini, masing-masing opsi menampilkan jarak ke alamat kios.
function GudangSection({ order, canManage, onUpdated }) {
    const [options, setOptions] = useState(null);
    const [selected, setSelected] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!canManage) return;
        api.get(`/orders/${order.id}/gudang-options`)
            .then(opts => {
                setOptions(opts);
                setSelected(order.gudang?.id ? String(order.gudang.id) : '');
            })
            .catch(e => setError(e.message));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [canManage, order.id]);

    async function handleSave() {
        if (!selected) return;
        setSaving(true);
        setError(null);
        try {
            await api.put(`/orders/${order.id}/gudang`, { gudang_submission_id: selected });
            onUpdated();
        } catch (err) {
            setError(err.message || 'Gagal menyimpan gudang.');
        } finally {
            setSaving(false);
        }
    }

    const belumDitentukan = !order.gudang && order.paymentStatus === 'paid';

    if (!canManage) {
        return (
            <dl className="space-y-3">
                <InfoRow label="Gudang"        value={belumDitentukan ? <GudangStatusBadge hasGudang={false} paymentStatus="paid" /> : order.gudang?.namaGudang} />
                <InfoRow label="Alamat Gudang" value={order.gudang?.alamatGudang} />
                <InfoRow label="Jarak ke Kios" value={formatDistance(order.gudang?.distanceMeters)} />
            </dl>
        );
    }

    return (
        <div className="space-y-3">
            {order.gudang ? (
                <div className="rounded-xl border border-white/8 bg-white/3 px-4 py-3 text-sm">
                    <p className="font-medium text-white">{order.gudang.namaGudang}</p>
                    <p className="text-xs text-slate-400">{order.gudang.alamatGudang}</p>
                    <p className="mt-1 text-xs text-teal-300">Jarak ke kios: {formatDistance(order.gudang.distanceMeters)}</p>
                </div>
            ) : belumDitentukan && (
                <GudangStatusBadge hasGudang={false} paymentStatus="paid" />
            )}

            {error && <p className="text-sm text-red-400">{error}</p>}

            {!options ? (
                <p className="text-sm text-slate-500">Memuat opsi gudang…</p>
            ) : options.length === 0 ? (
                <p className="text-sm italic text-slate-500">Belum ada gudang yang disetujui di region ini.</p>
            ) : (
                <div className="flex flex-wrap items-end gap-3">
                    <div className="min-w-[220px] flex-1 space-y-1">
                        <label className="block text-xs font-medium text-slate-400">Pilih Gudang Asal (diurutkan terdekat)</label>
                        <select value={selected} onChange={e => setSelected(e.target.value)}
                            className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-teal-400/40 transition">
                            <option value="">-- Pilih gudang --</option>
                            {options.map(o => (
                                <option key={o.id} value={o.id}>
                                    {o.namaGudang} ({formatDistance(o.distanceMeters)})
                                </option>
                            ))}
                        </select>
                    </div>
                    <button onClick={handleSave} disabled={saving || !selected}
                        className="rounded-xl bg-teal-500 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-400 disabled:opacity-50 transition">
                        {saving ? 'Menyimpan…' : 'Simpan Gudang'}
                    </button>
                </div>
            )}
        </div>
    );
}

const SHIPMENT_STATUS_LABEL = {
    belum_ditugaskan: 'Belum Ditugaskan ke Truk',
    siap_muat:        'Siap Muat (menunggu sopir berangkat)',
    dalam_perjalanan: 'Dalam Perjalanan',
    selesai:          'Selesai',
};

const EMPTY_SLOT = { product_code: '', product_name: '', quota_ton: '' };

// AdminRegion: tentukan Pengiriman Penuh (otomatis, 1 truk per produk yang
// dibeli — tanpa input manual, kuota selalu pas dengan ton pembelian) atau
// Pengiriman Parsial (2-5 truk, manual: pilih produk dari order.items lalu
// bagi kuotanya sendiri, total per produk tetap wajib pas dengan ton pembelian).
function PengirimanModal({ order, onClose, onSaved }) {
    const [shippingType, setShippingType] = useState('penuh');
    const [slots, setSlots] = useState([{ ...EMPTY_SLOT }, { ...EMPTY_SLOT }]);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);

    const productOptions = useMemo(() => {
        const seen = new Map();
        (order.items ?? []).forEach(item => {
            if (item.productCode && !seen.has(item.productCode)) {
                seen.set(item.productCode, { name: item.productName, quantity: Number(item.quantity) || 0 });
            }
        });
        return Array.from(seen, ([code, v]) => ({ code, name: v.name, quantity: v.quantity }));
    }, [order.items]);

    // Total yang sudah dialokasikan untuk satu kode produk di SELURUH slot
    // kecuali slot tertentu (dipakai untuk hitung sisa kuota saat memilih produk).
    function allocatedForCode(code, exceptIndex = -1) {
        return slots.reduce((sum, s, i) => (i !== exceptIndex && s.product_code === code ? sum + (parseFloat(s.quota_ton) || 0) : sum), 0);
    }

    // Status alokasi per produk (Parsial saja — Penuh selalu otomatis pas).
    const allocationStatus = useMemo(() => {
        return productOptions.map(o => {
            const allocated = allocatedForCode(o.code);
            return { ...o, allocated, ok: Math.abs(allocated - o.quantity) < 0.005 };
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [productOptions, slots]);

    const allAllocated = allocationStatus.length > 0 && allocationStatus.every(s => s.ok);

    function updateSlot(index, field, value) {
        setSlots(rows => rows.map((row, i) => (i === index ? { ...row, [field]: value } : row)));
    }

    function updateSlotProduct(index, code) {
        const opt = productOptions.find(o => o.code === code);
        const defaultQuota = opt ? Math.max(opt.quantity - allocatedForCode(code, index), 0) : '';
        setSlots(rows => rows.map((row, i) => (i === index
            ? { ...row, product_code: code, product_name: opt?.name ?? '', quota_ton: defaultQuota === '' ? '' : String(defaultQuota) }
            : row)));
    }

    function addSlot() {
        if (slots.length >= 5) return;
        setSlots(rows => [...rows, { ...EMPTY_SLOT }]);
    }

    function removeSlot(index) {
        if (slots.length <= 2) return;
        setSlots(rows => rows.filter((_, i) => i !== index));
    }

    async function handleSubmit(e) {
        e.preventDefault();
        if (shippingType === 'parsial') {
            if (slots.some(s => !s.product_code)) { setError('Pilih produk untuk setiap truk.'); return; }
            if (!allAllocated) { setError('Total kuota tiap produk harus pas sama dengan jumlah pembelian — tidak boleh lebih atau kurang.'); return; }
        }
        setSaving(true);
        setError(null);
        try {
            await api.put(`/orders/${order.id}/pengiriman`, shippingType === 'penuh'
                ? { shipping_type: 'penuh' }
                : { shipping_type: 'parsial', slots: slots.map(s => ({ product_code: s.product_code, product_name: s.product_name, quota_ton: s.quota_ton })) });
            onSaved();
            onClose();
        } catch (err) {
            setError(err.message || 'Gagal menyimpan pengiriman.');
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={onClose} />
            <div className="relative z-10 w-full max-w-lg rounded-2xl border border-white/10 bg-slate-900 shadow-2xl">
                <div className="flex items-center justify-between border-b border-white/8 px-6 py-4">
                    <h2 className="text-base font-semibold text-white">Atur Pengiriman</h2>
                    <button onClick={onClose} className="rounded-lg p-1 text-slate-500 hover:text-white transition"><X size={18} /></button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="max-h-[70vh] overflow-y-auto px-6 py-5 space-y-4">
                        {error && (
                            <div className="rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-300">{error}</div>
                        )}

                        <div className="flex gap-3">
                            <button type="button" onClick={() => setShippingType('penuh')}
                                className={`flex-1 rounded-xl border px-4 py-2.5 text-sm font-medium transition ${shippingType === 'penuh' ? 'border-amber-400/40 bg-amber-400/10 text-amber-300' : 'border-white/10 text-slate-400 hover:text-white'}`}>
                                Pengiriman Penuh
                            </button>
                            <button type="button" onClick={() => setShippingType('parsial')}
                                className={`flex-1 rounded-xl border px-4 py-2.5 text-sm font-medium transition ${shippingType === 'parsial' ? 'border-amber-400/40 bg-amber-400/10 text-amber-300' : 'border-white/10 text-slate-400 hover:text-white'}`}>
                                Pengiriman Parsial
                            </button>
                        </div>

                        {productOptions.length === 0 && (
                            <p className="text-xs text-red-400">Order ini tidak memiliki data item produk, Pengiriman belum bisa diatur.</p>
                        )}

                        {shippingType === 'penuh' ? (
                            <div className="space-y-2">
                                <p className="text-xs text-slate-500">
                                    Otomatis — 1 truk per produk, kuota mengikuti jumlah pembelian. Tidak perlu input manual.
                                </p>
                                {productOptions.map(o => (
                                    <div key={o.code} className="flex items-center justify-between rounded-xl border border-white/8 bg-white/3 px-3 py-2.5 text-sm">
                                        <span className="text-slate-300">{o.code} — {o.name}</span>
                                        <span className="font-medium text-white">{o.quantity.toFixed(2)} Ton</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <>
                                <p className="text-xs text-slate-500">
                                    Pesanan dibagi ke beberapa truk (2-5 truk) — pilih produk & bagi kuotanya sendiri per truk.
                                </p>

                                <div className="space-y-3">
                                    {slots.map((slot, index) => (
                                        <div key={index} className="rounded-xl border border-white/8 bg-white/3 p-3">
                                            <div className="mb-2 flex items-center justify-between">
                                                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Truk {index + 1}</p>
                                                {slots.length > 2 && (
                                                    <button type="button" onClick={() => removeSlot(index)}
                                                        className="text-xs text-red-400 hover:text-red-300 transition">Hapus</button>
                                                )}
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="space-y-1">
                                                    <label className="block text-xs font-medium text-slate-400">Produk</label>
                                                    <select value={slot.product_code}
                                                        onChange={e => updateSlotProduct(index, e.target.value)}
                                                        className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-amber-400/40 transition">
                                                        <option value="">-- Pilih produk --</option>
                                                        {productOptions.map(o => (
                                                            <option key={o.code} value={o.code}>{o.code} — {o.name}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="block text-xs font-medium text-slate-400">Kuota (Ton)</label>
                                                    <input type="number" step="0.01" min="0.01" value={slot.quota_ton}
                                                        onChange={e => updateSlot(index, 'quota_ton', e.target.value)}
                                                        className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-amber-400/40 transition" />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {slots.length < 5 && (
                                    <button type="button" onClick={addSlot}
                                        className="flex items-center gap-1.5 text-xs text-amber-300 hover:text-amber-200 transition">
                                        <Plus size={14} /> Tambah Truk
                                    </button>
                                )}

                                {allocationStatus.length > 0 && (
                                    <div className="space-y-1.5 rounded-xl border border-white/8 bg-white/3 p-3">
                                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Alokasi Kuota</p>
                                        {allocationStatus.map(s => (
                                            <div key={s.code} className="flex items-center justify-between text-xs">
                                                <span className="text-slate-400">{s.code} — {s.name}</span>
                                                <span className={s.ok ? 'text-emerald-400' : 'text-red-400'}>
                                                    {s.allocated.toFixed(2)} / {s.quantity.toFixed(2)} Ton
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </>
                        )}
                    </div>

                    <div className="flex justify-end gap-3 border-t border-white/8 px-6 py-4">
                        <button type="button" onClick={onClose}
                            className="rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-400 hover:text-white transition">
                            Batal
                        </button>
                        <button type="submit" disabled={saving || productOptions.length === 0 || (shippingType === 'parsial' && !allAllocated)}
                            className="rounded-xl bg-amber-400 px-5 py-2 text-sm font-semibold text-slate-950 hover:bg-amber-300 disabled:opacity-50 transition">
                            {saving ? 'Menyimpan…' : 'Simpan Pengiriman'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// AdminTransport: pilih truk terdaftar (akun transportir) + isi nama sopir manual
// untuk satu slot truk yang belum ditugaskan.
function AssignTruckForm({ shipmentId, onAssigned }) {
    const [drivers, setDrivers] = useState([]);
    const [transportirEmail, setTransportirEmail] = useState('');
    const [driverName, setDriverName] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        api.get('/app-users/transportir', { per_page: 200 })
            .then(d => setDrivers(d?.data ?? []))
            .catch(() => {});
    }, []);

    function handleDriverChange(email) {
        setTransportirEmail(email);
        const picked = drivers.find(d => d.Email === email);
        if (picked) setDriverName(picked.TransportirName || picked.DisplayName || '');
    }

    async function handleSubmit(e) {
        e.preventDefault();
        if (!transportirEmail) { setError('Pilih truk terdaftar terlebih dahulu.'); return; }
        if (!driverName.trim()) { setError('Nama sopir wajib diisi.'); return; }
        setSaving(true);
        setError(null);
        try {
            await api.post(`/shipments/${shipmentId}/assign`, {
                transportir_email: transportirEmail,
                driver_name: driverName.trim(),
            });
            onAssigned();
        } catch (err) {
            setError(err.message || 'Gagal mengalokasikan truk.');
        } finally {
            setSaving(false);
        }
    }

    return (
        <form onSubmit={handleSubmit} className="mt-3 space-y-3 rounded-xl border border-sky-400/20 bg-sky-400/5 p-3">
            {error && <p className="text-xs text-red-400">{error}</p>}
            <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                    <label className="block text-xs font-medium text-slate-400">Truk Terdaftar</label>
                    <select value={transportirEmail} onChange={e => handleDriverChange(e.target.value)}
                        className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-sky-400/40 transition">
                        <option value="">— Pilih truk —</option>
                        {drivers.map(d => (
                            <option key={d.Email} value={d.Email}>
                                {d.Type || 'Truk'} {d.PoliceNumber ? `(${d.PoliceNumber})` : ''} — {d.TransportirName || d.DisplayName}
                            </option>
                        ))}
                    </select>
                </div>
                <div className="space-y-1">
                    <label className="block text-xs font-medium text-slate-400">Nama Sopir</label>
                    <input type="text" value={driverName} onChange={e => setDriverName(e.target.value)}
                        placeholder="Nama sopir yang membawa truk"
                        className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-sky-400/40 transition" />
                </div>
            </div>
            <button type="submit" disabled={saving}
                className="rounded-xl bg-sky-500 px-4 py-2 text-xs font-semibold text-white hover:bg-sky-400 disabled:opacity-50 transition">
                {saving ? 'Menyimpan…' : 'Alokasikan Truk'}
            </button>
        </form>
    );
}

export default function OrderDetail({ user }) {
    const { id }                    = useParams();
    const navigate                  = useNavigate();
    const [order,   setOrder]       = useState(null);
    const [loading, setLoading]     = useState(true);
    const [error,   setError]       = useState(null);
    const [cancelOpen, setCancelOpen] = useState(false);
    const [pengirimanOpen, setPengirimanOpen] = useState(false);

    const canDownloadDocs       = user?.role === 'SuperAdmin' || user?.role === 'AdminRegion';
    const canManageGudang       = user?.role === 'AdminRegion';
    const canAssignTruck        = user?.role === 'AdminTransport' || user?.role === 'SuperAdmin';
    const canDownloadPengantar  = ['SuperAdmin', 'AdminRegion', 'AdminTransport'].includes(user?.role);
    const hideFinancials        = user?.role === 'AdminTransport';
    const shipments             = order?.shipments ?? [];
    const canConfigurePengiriman = user?.role === 'AdminRegion'
        && shipments.every(s => s.status === 'belum_ditugaskan');
    const canCancel       = (user?.role === 'SuperAdmin' || user?.role === 'AdminTransport')
        && order?.paymentStatus === 'paid'
        && !['delivered', 'cancelled'].includes(order?.orderStatus);

    function reload() {
        setLoading(true);
        api.get(`/orders/${id}`)
            .then(setOrder)
            .catch(e => setError(e.message))
            .finally(() => setLoading(false));
    }

    useEffect(() => { reload(); }, [id]);

    if (loading) {
        return (
            <div className="space-y-4">
                <div className="h-8 w-48 animate-pulse rounded-lg bg-white/5" />
                <div className="h-64 animate-pulse rounded-2xl bg-white/5" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-300">
                Gagal memuat order: {error}
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-4">
                <button
                    onClick={() => navigate(-1)}
                    className="rounded-lg border border-white/10 bg-white/5 p-2 text-slate-400 hover:text-white transition"
                >
                    <ArrowLeft size={18} />
                </button>
                <div>
                    <h1 className="text-2xl font-semibold text-white">Order Detail</h1>
                    <p className="mt-0.5 font-mono text-sm text-slate-400">{order?.poNumber}</p>
                </div>
                {!hideFinancials && <PaymentStatusBadge value={order?.paymentStatus} />}
                <OrderStatusBadge value={order?.orderStatus} />
                {!hideFinancials && <GudangStatusBadge hasGudang={Boolean(order?.gudang)} paymentStatus={order?.paymentStatus} />}

                <div className="ml-auto flex flex-wrap items-center gap-2">
                    {canCancel && (
                        <button
                            onClick={() => setCancelOpen(true)}
                            className="flex items-center gap-2 rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-2 text-sm font-semibold text-red-300 hover:bg-red-400/20 transition"
                        >
                            <Ban size={15} />
                            Batalkan Pesanan
                        </button>
                    )}
                    {canDownloadDocs && order && (
                        <a
                            href={`/api/admin/orders/${order.id}/bptp`}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-2 rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-2 text-sm font-semibold text-amber-300 hover:bg-amber-400/20 transition"
                        >
                            <Download size={15} />
                            Unduh BPTP
                        </a>
                    )}
                    {canDownloadDocs && shipments.length > 0 && (
                        <a
                            href={`/api/admin/orders/${order.id}/surat-jalan`}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-2 rounded-xl border border-sky-400/30 bg-sky-400/10 px-4 py-2 text-sm font-semibold text-sky-300 hover:bg-sky-400/20 transition"
                        >
                            <Download size={15} />
                            Unduh Surat Jalan
                        </a>
                    )}
                </div>
            </div>

            {order?.orderStatusNote && (
                <div className="rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-300">
                    Catatan: {order.orderStatusNote}
                </div>
            )}

            <div className="divide-y divide-white/8 rounded-2xl border border-white/8 bg-slate-950/55">
                <Section title="Informasi Order">
                    <dl className="space-y-3">
                        <InfoRow label="PO Number"      value={order?.poNumber} />
                        <InfoRow label="No. Resi"       value={order?.resiNomor} />
                        <InfoRow label="Email Pembeli"  value={order?.userEmail} />
                        <InfoRow label="Vendor"         value={order?.vendor} />
                        {!hideFinancials && (
                            <>
                                <InfoRow label="Payment"        value={order?.paymentMethod} />
                                <InfoRow label="Virtual Account" value={order?.virtualAccount} />
                                <InfoRow label="VA Expired"     value={formatDate(order?.vaExpiredAt)} />
                            </>
                        )}
                    </dl>
                </Section>

                {!hideFinancials && (
                    <Section title="Rincian Biaya">
                        <dl className="space-y-3">
                            <InfoRow label="Subtotal"       value={formatRupiah(order?.subTotal)} />
                            <InfoRow label="Pajak"          value={formatRupiah(order?.taxAmount)} />
                            <InfoRow label="Ongkir"         value={formatRupiah(order?.shippingAmount)} />
                            <InfoRow label="Total"          value={<span className="text-base font-semibold text-amber-300">{formatRupiah(order?.totalAmount)}</span>} />
                        </dl>
                    </Section>
                )}

                <Section title="Timeline">
                    <dl className="space-y-3">
                        <InfoRow label="Dibuat"     value={formatDate(order?.createdAt)} />
                        <InfoRow label="Dibayar"    value={formatDate(order?.paidAt)} />
                        <InfoRow label="Dikirim"    value={formatDate(order?.deliveredAt)} />
                        <InfoRow label="Diperbarui" value={formatDate(order?.updatedAt)} />
                    </dl>
                </Section>

                {order?.kiosk && (
                    <Section title="Alamat Kios">
                        <dl className="space-y-3">
                            <InfoRow label="Nama Kios"      value={order.kiosk.kioskName || order.kiosk.displayName} />
                            <InfoRow label="No. Telepon"    value={order.kiosk.phone} />
                            <InfoRow label="Propinsi"       value={order.kiosk.propinsi} />
                            <InfoRow label="Kabupaten/Kota" value={order.kiosk.kabupaten} />
                            <InfoRow label="Kecamatan"      value={order.kiosk.kecamatan} />
                            <InfoRow label="Kelurahan"      value={order.kiosk.kelurahan} />
                            <InfoRow label="Kode Pos"       value={order.kiosk.kodePos} />
                            <InfoRow label="Alamat Lengkap" value={order.kiosk.alamatLengkap} />
                            <InfoRow label="Koordinat"      value={(order.kiosk.latitude && order.kiosk.longitude) ? `${order.kiosk.latitude}, ${order.kiosk.longitude}` : '—'} />
                        </dl>
                    </Section>
                )}

                {order?.items?.length > 0 && (
                    <Section title="Item Order">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-white/8">
                                        {(hideFinancials ? ['Kode Produk', 'Produk', 'Qty'] : ['Kode Produk', 'Produk', 'Qty', 'Harga', 'Total']).map(h => (
                                            <th key={h} className="pb-2 pr-4 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 last:pr-0">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {order.items.map((item, index) => (
                                        <tr key={item.id ?? `${item.productCode ?? item.productName ?? 'item'}-${index}`}>
                                            <td className="py-2.5 pr-4 font-mono text-xs text-slate-400">{item.productCode || '—'}</td>
                                            <td className="py-2.5 pr-4 text-slate-200">{item.productName || '—'}</td>
                                            <td className="py-2.5 pr-4 text-slate-300">{item.quantity}</td>
                                            {!hideFinancials && (
                                                <>
                                                    <td className="py-2.5 pr-4 text-slate-300">{formatRupiah(item.unitPrice)}</td>
                                                    <td className="py-2.5 text-slate-200">{formatRupiah(item.totalPrice)}</td>
                                                </>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Section>
                )}

                <Section title="Gudang Pengiriman">
                    <GudangSection order={order} canManage={canManageGudang} onUpdated={reload} />
                </Section>

                <Section title="Pengiriman">
                    {canConfigurePengiriman && (
                        <button onClick={() => setPengirimanOpen(true)}
                            className="mb-4 flex items-center gap-2 rounded-xl bg-amber-400 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-amber-300 transition">
                            <Truck size={15} />
                            {shipments.length > 0 ? 'Ubah Pengiriman' : 'Atur Pengiriman'}
                        </button>
                    )}

                    {shipments.length === 0 && !canConfigurePengiriman && (
                        <p className="text-sm italic text-slate-500">Pengiriman belum diatur oleh Admin Region.</p>
                    )}

                    <div className="space-y-4">
                        {shipments.map((s, index) => (
                            <div key={s.id} className="rounded-xl border border-white/8 bg-white/3 p-4">
                                <div className="mb-3 flex items-center justify-between">
                                    <p className="text-sm font-semibold text-white">
                                        Truk {index + 1} — {s.productCode ? `${s.productCode} — ` : ''}{s.productName} ({s.quotaTon} Ton)
                                    </p>
                                    <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-xs text-slate-300">
                                        {SHIPMENT_STATUS_LABEL[s.status] ?? s.status}
                                    </span>
                                </div>

                                {s.status !== 'belum_ditugaskan' && (
                                    <dl className="space-y-2">
                                        <InfoRow label="Sopir"        value={s.driverName} />
                                        <InfoRow label="Transportir"  value={s.transportirEmail} />
                                        <InfoRow label="Kendaraan"    value={`${s.truckLabel ?? '—'} ${s.policeNumber ? `(${s.policeNumber})` : ''}`} />
                                        <InfoRow label="Gudang Asal"  value={s.warehouseName} />
                                        <InfoRow label="Muat Berangkat (Load-In)" value={formatDate(s.muatInAt)} />
                                        <InfoRow label="Muat Tiba (Load-Out)"     value={formatDate(s.muatOutAt)} />
                                    </dl>
                                )}

                                {(s.muatInPhotoUrl || s.muatOutPhotoUrl) && (
                                    <div className="mt-3 grid grid-cols-2 gap-4">
                                        {s.muatInPhotoUrl && (
                                            <div>
                                                <p className="mb-1 text-xs uppercase tracking-[0.2em] text-slate-500">Foto Load-In</p>
                                                <img src={s.muatInPhotoUrl} alt="Foto load-in" className="rounded-xl border border-white/10" />
                                            </div>
                                        )}
                                        {s.muatOutPhotoUrl && (
                                            <div>
                                                <p className="mb-1 text-xs uppercase tracking-[0.2em] text-slate-500">Foto Load-Out</p>
                                                <img src={s.muatOutPhotoUrl} alt="Foto load-out" className="rounded-xl border border-white/10" />
                                            </div>
                                        )}
                                    </div>
                                )}

                                {s.status === 'belum_ditugaskan' && canAssignTruck && (
                                    <AssignTruckForm shipmentId={s.id} onAssigned={reload} />
                                )}

                                {s.status !== 'belum_ditugaskan' && canDownloadPengantar && (
                                    <a
                                        href={`/api/admin/shipments/${s.id}/surat-jalan-pengantar`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="mt-3 inline-flex items-center gap-2 rounded-xl border border-sky-400/30 bg-sky-400/10 px-3 py-1.5 text-xs font-semibold text-sky-300 hover:bg-sky-400/20 transition"
                                    >
                                        <Download size={13} />
                                        Unduh Surat Jalan
                                    </a>
                                )}
                            </div>
                        ))}
                    </div>
                </Section>
            </div>

            {cancelOpen && (
                <CancelModal order={order} onClose={() => setCancelOpen(false)} onCancelled={reload} />
            )}

            {pengirimanOpen && (
                <PengirimanModal order={order} onClose={() => setPengirimanOpen(false)} onSaved={reload} />
            )}
        </div>
    );
}
