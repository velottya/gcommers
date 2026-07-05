import { ArrowLeft, Ban, Download, Plus, X } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../../api/client';
import { OrderStatusBadge, PaymentStatusBadge, SoStatusBadge } from '../ui/StatusBadge';

function formatRupiah(val) {
    if (val == null) return '—';
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);
}

function formatDate(val) {
    if (!val) return '—';
    return new Date(val).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
}

function formatTon(val) {
    const n = Number(val ?? 0);
    return `${Number.isInteger(n) ? n : n.toFixed(2)} ton`;
}

function Card({ title, children, className = '' }) {
    return (
        <div className={`rounded-2xl border border-white/8 bg-slate-950/55 p-5 ${className}`}>
            {title && <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">{title}</p>}
            {children}
        </div>
    );
}

function InfoGrid({ rows }) {
    return (
        <dl className="grid grid-cols-1 gap-y-2.5">
            {rows.map(([label, value]) => value != null && value !== '—' && (
                <div key={label} className="grid grid-cols-[120px_1fr] gap-2 items-start">
                    <dt className="text-xs text-slate-500 pt-0.5">{label}</dt>
                    <dd className="text-sm text-slate-200 break-words">{value}</dd>
                </div>
            ))}
        </dl>
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

// Alokasi mitra transportir per produk (AdminRegion): 1 pesanan bisa dipecah ke
// beberapa mitra, masing-masing membawa sebagian/seluruh tonase 1 produk. Tulis ke
// order_transport_assignments (bukan Orders.Vendor lagi) — ShipmentController
// (Alokasi Sopir AdminTransport) menyaring lewat tabel ini.
function TransportAssignmentRow({ item, partnerOptions, onAdd }) {
    const [company, setCompany] = useState('');
    const [ton, setTon]         = useState('');
    const [error, setError]     = useState(null);

    function handleAdd() {
        const qty = parseFloat(ton);
        if (!company) { setError('Pilih mitra transportir.'); return; }
        if (!qty || qty <= 0) { setError('Tonase wajib diisi.'); return; }
        if (qty - item.remaining_ton > 0.01) { setError(`Sisa yang boleh dialokasikan: ${formatTon(item.remaining_ton)}.`); return; }
        setError(null);
        onAdd(company, qty);
        setCompany('');
        setTon('');
    }

    if (item.remaining_ton <= 0.01) return null;

    return (
        <div className="space-y-1">
            <div className="flex flex-wrap items-end gap-2">
                <select value={company} onChange={e => setCompany(e.target.value)}
                    className="min-w-[180px] flex-1 rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-teal-400/40 transition">
                    <option value="">-- Pilih mitra --</option>
                    {partnerOptions.map(o => (
                        <option key={o.company_name} value={o.company_name}>{o.company_name}</option>
                    ))}
                </select>
                <input type="number" min="0.01" step="0.01" value={ton} onChange={e => setTon(e.target.value)}
                    placeholder={`maks. ${formatTon(item.remaining_ton)}`}
                    className="w-32 rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-teal-400/40 transition" />
                <button type="button" onClick={handleAdd}
                    className="inline-flex items-center gap-1 rounded-lg border border-teal-400/30 bg-teal-400/10 px-3 py-2 text-xs font-medium text-teal-300 hover:bg-teal-400/20 transition">
                    <Plus size={13} /> Tambah
                </button>
            </div>
            {error && <p className="text-xs text-red-400">{error}</p>}
        </div>
    );
}

function TransportAssignmentSection({ order, canManage, onUpdated }) {
    const [data,    setData]    = useState(null);
    const [edited,  setEdited]  = useState(null); // { [product_id]: [{company_name, quota_ton}] }
    const [saving,  setSaving]  = useState(false);
    const [error,   setError]   = useState(null);

    useEffect(() => {
        if (!canManage) return;
        api.get(`/orders/${order.id}/transport-assignments`)
            .then(d => {
                setData(d);
                const map = {};
                (d.items ?? []).forEach(it => { map[it.product_id] = it.assignments.map(a => ({ ...a })); });
                setEdited(map);
            })
            .catch(e => setError(e.message));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [canManage, order.id]);

    function remainingFor(item) {
        const used = (edited?.[item.product_id] ?? []).reduce((s, a) => s + Number(a.quota_ton), 0);
        return Math.max(0, Math.round((item.purchased_ton - used) * 100) / 100);
    }

    function addAssignment(productId, company, ton) {
        setEdited(prev => ({ ...prev, [productId]: [...(prev[productId] ?? []), { company_name: company, quota_ton: ton }] }));
    }

    function removeAssignment(productId, index) {
        setEdited(prev => ({ ...prev, [productId]: prev[productId].filter((_, i) => i !== index) }));
    }

    async function handleSave() {
        setSaving(true);
        setError(null);
        try {
            const assignments = Object.entries(edited).flatMap(([productId, rows]) =>
                rows.map(r => ({ product_id: Number(productId), company_name: r.company_name, quota_ton: Number(r.quota_ton) }))
            );
            await api.put(`/orders/${order.id}/transport-assignments`, { assignments });
            onUpdated();
        } catch (err) {
            setError(err.message || 'Gagal menyimpan alokasi mitra transportir.');
        } finally {
            setSaving(false);
        }
    }

    if (!canManage) {
        return (
            <div className="space-y-3">
                {(order.items ?? []).map(item => (
                    <div key={item.id} className="rounded-xl border border-white/8 bg-white/3 px-4 py-3 text-sm">
                        <p className="font-medium text-white">{item.productName}</p>
                        {(item.transportAssignments ?? []).length === 0 ? (
                            <p className="mt-1 text-xs italic text-slate-500">Belum ada mitra transportir ditugaskan.</p>
                        ) : (
                            <ul className="mt-1 space-y-0.5 text-xs text-slate-300">
                                {item.transportAssignments.map((a, i) => (
                                    <li key={i}>{a.company_name} — {formatTon(a.quota_ton)}</li>
                                ))}
                            </ul>
                        )}
                    </div>
                ))}
            </div>
        );
    }

    if (!data || !edited) {
        return <p className="text-sm text-slate-500">Memuat data alokasi…</p>;
    }

    return (
        <div className="space-y-4">
            {error && <p className="text-sm text-red-400">{error}</p>}
            {data.items.length === 0 && (
                <p className="text-sm italic text-slate-500">Tidak ada produk pada pesanan ini.</p>
            )}
            {data.items.map(item => (
                <div key={item.product_id} className="rounded-xl border border-white/8 bg-white/3 p-4">
                    <div className="mb-2 flex items-center justify-between">
                        <p className="text-sm font-medium text-white">
                            {item.product_code ? <span className="mr-1 font-mono text-xs text-slate-500">{item.product_code}</span> : null}
                            {item.product_name}
                        </p>
                        <span className="text-xs text-slate-400">Dibeli {formatTon(item.purchased_ton)}</span>
                    </div>

                    <div className="space-y-1.5">
                        {(edited[item.product_id] ?? []).map((a, i) => (
                            <div key={i} className="flex items-center justify-between rounded-lg border border-white/8 bg-white/4 px-3 py-1.5 text-xs">
                                <span className="text-slate-200">{a.company_name} — {formatTon(a.quota_ton)}</span>
                                <button type="button" onClick={() => removeAssignment(item.product_id, i)}
                                    className="rounded p-1 text-slate-500 hover:text-red-300 transition">
                                    <X size={13} />
                                </button>
                            </div>
                        ))}
                    </div>

                    <div className="mt-2">
                        <TransportAssignmentRow
                            item={{ ...item, remaining_ton: remainingFor(item) }}
                            partnerOptions={data.partnerOptions}
                            onAdd={(company, ton) => addAssignment(item.product_id, company, ton)}
                        />
                    </div>
                </div>
            ))}

            {data.items.length > 0 && (
                <div className="flex justify-end">
                    <button onClick={handleSave} disabled={saving}
                        className="rounded-xl bg-teal-500 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-400 disabled:opacity-50 transition">
                        {saving ? 'Menyimpan…' : 'Simpan Alokasi Mitra Transportir'}
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

function LoadStatusChip({ done, label }) {
    return (
        <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${
            done
                ? 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300'
                : 'border-white/8 bg-white/3 text-slate-500'
        }`}>
            {done ? '✓' : '–'} {label}
        </span>
    );
}

// Ringkasan progres per mitra dan per sopir — ditampilkan di atas kartu truk
// supaya terlihat sekilas siapa saja yang sudah/belum load-in dan load-out.
function DeliverySummary({ shipments }) {
    if (!shipments || shipments.length === 0) return null;

    const byMitra = {};
    shipments.forEach(s => {
        const key = s.companyName || '(Mitra tidak diketahui)';
        if (!byMitra[key]) byMitra[key] = [];
        byMitra[key].push(s);
    });

    const entries = Object.entries(byMitra);

    return (
        <div className="mb-5 rounded-xl border border-white/8 bg-white/3 p-4">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                Progres Pengiriman
            </p>
            <div className="space-y-4">
                {entries.map(([mitra, slots]) => {
                    const loadInDone  = slots.filter(s => s.muatInAt).length;
                    const loadOutDone = slots.filter(s => s.muatOutAt).length;
                    const total       = slots.length;

                    return (
                        <div key={mitra}>
                            <div className="mb-1.5 flex items-center justify-between gap-2">
                                <p className="text-sm font-medium text-slate-200">{mitra}</p>
                                <p className="text-[11px] text-slate-500">
                                    Load-In {loadInDone}/{total} · Load-Out {loadOutDone}/{total}
                                </p>
                            </div>
                            <div className="space-y-1.5">
                                {slots.map((s, i) => (
                                    <div key={s.id}
                                        className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-white/6 bg-white/2 px-3 py-1.5">
                                        <span className="min-w-[6rem] flex-1 text-xs text-slate-300 truncate">
                                            {s.driverName || `Sopir ${i + 1}`}
                                        </span>
                                        <span className="text-[10px] text-slate-600 font-mono">
                                            {s.productName ? `${s.productName} ${s.quotaTon}T` : ''}
                                        </span>
                                        <div className="flex items-center gap-1.5">
                                            <LoadStatusChip done={!!s.muatInAt}  label="Load-In" />
                                            <LoadStatusChip done={!!s.muatOutAt} label="Load-Out" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export default function OrderDetail({ user }) {
    const { id }                    = useParams();
    const navigate                  = useNavigate();
    const [order,   setOrder]       = useState(null);
    const [loading, setLoading]     = useState(true);
    const [error,   setError]       = useState(null);
    const [cancelOpen, setCancelOpen] = useState(false);

    const canDownloadDocs       = user?.role === 'SuperAdmin' || user?.role === 'AdminRegion';
    const canManageTransportPartner = user?.role === 'AdminRegion';
    const canDownloadPengantar  = ['SuperAdmin', 'AdminRegion', 'AdminTransport'].includes(user?.role);
    const hideFinancials        = user?.role === 'AdminTransport';
    const shipments             = order?.shipments ?? [];
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
        <div className="space-y-5">

            {/* ── Header ── */}
            <div className="flex flex-wrap items-center gap-3">
                <button onClick={() => navigate(-1)}
                    className="rounded-lg border border-white/10 bg-white/5 p-2 text-slate-400 hover:text-white transition">
                    <ArrowLeft size={18} />
                </button>
                <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                        <h1 className="text-xl font-semibold text-white">Detail Pesanan</h1>
                        <span className="font-mono text-sm text-slate-500">{order?.poNumber}</span>
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2">
                        <OrderStatusBadge value={order?.orderStatus} />
                        {!hideFinancials && <PaymentStatusBadge value={order?.paymentStatus} />}
                        {!hideFinancials && <SoStatusBadge status={order?.soStatus} />}
                    </div>
                </div>
                {canCancel && (
                    <button onClick={() => setCancelOpen(true)}
                        className="flex items-center gap-2 rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-2 text-sm font-semibold text-red-300 hover:bg-red-400/20 transition">
                        <Ban size={15} /> Batalkan
                    </button>
                )}
            </div>

            {order?.orderStatusNote && (
                <div className="rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-300">
                    Catatan pembatalan: {order.orderStatusNote}
                </div>
            )}

            {/* ── Row 1: Info order (kiri) + Timeline & Biaya (kanan) ── */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">

                {/* Kiri: Informasi pesanan + Kiosk */}
                <div className="space-y-4">
                    <Card title="Informasi Pesanan">
                        <InfoGrid rows={[
                            ['No. Pesanan',    order?.poNumber],
                            ['Email Pembeli',  order?.userEmail],
                            ...(!hideFinancials ? [
                                ['Metode Bayar', order?.paymentMethod],
                                ['Virtual Account', order?.virtualAccount],
                                ['VA Expired',   formatDate(order?.vaExpiredAt)],
                            ] : []),
                        ]} />
                    </Card>

                    {order?.kiosk && (
                        <Card title="Kiosk Penerima">
                            <InfoGrid rows={[
                                ['Nama Kiosk',   order.kiosk.kioskName || order.kiosk.displayName],
                                ['Telepon',      order.kiosk.phone],
                                ['Propinsi',     order.kiosk.propinsi],
                                ['Kab/Kota',     order.kiosk.kabupaten],
                                ['Kecamatan',    order.kiosk.kecamatan],
                                ['Kelurahan',    order.kiosk.kelurahan],
                                ['Kode Pos',     order.kiosk.kodePos],
                                ['Alamat',       order.kiosk.alamatLengkap],
                            ]} />
                        </Card>
                    )}
                </div>

                {/* Kanan: Timeline + Keuangan */}
                <div className="space-y-4">
                    <Card title="Timeline">
                        <InfoGrid rows={[
                            ['Dibuat',      formatDate(order?.createdAt)],
                            ['Dibayar',     formatDate(order?.paidAt)],
                            ['Dikirim',     formatDate(order?.deliveredAt)],
                            ['Diperbarui',  formatDate(order?.updatedAt)],
                        ]} />
                    </Card>

                    {!hideFinancials && (
                        <Card title="Rincian Biaya">
                            <div className="space-y-2">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-slate-400">Subtotal</span>
                                    <span className="text-slate-200">{formatRupiah(order?.subTotal)}</span>
                                </div>
                                <div className="flex items-center justify-between border-t border-white/8 pt-2">
                                    <span className="text-sm font-semibold text-white">Total</span>
                                    <span className="text-base font-bold text-amber-300">{formatRupiah(order?.totalAmount)}</span>
                                </div>
                            </div>
                        </Card>
                    )}

                    {/* Item Order — masuk ke kanan karena biasanya tidak terlalu banyak baris */}
                    {order?.items?.length > 0 && (
                        <Card title="Item Pesanan">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-white/8">
                                            <th className="pb-2 pr-3 text-left text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500">Produk</th>
                                            <th className="pb-2 pr-3 text-right text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500">Qty</th>
                                            {!hideFinancials && <th className="pb-2 pr-3 text-right text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500">Total</th>}
                                            <th className="pb-2 pr-3 text-left text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500">SO</th>
                                            <th className="pb-2 text-left text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500">Gudang</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {order.items.map((item, index) => (
                                            <tr key={item.id ?? index}>
                                                <td className="py-2.5 pr-3">
                                                    <p className="text-slate-200 text-sm">{item.productName || '—'}</p>
                                                    {item.productCode && <p className="font-mono text-xs text-slate-500">{item.productCode}</p>}
                                                </td>
                                                <td className="py-2.5 pr-3 text-right text-slate-300 text-sm">{item.quantity}</td>
                                                {!hideFinancials && (
                                                    <td className="py-2.5 pr-3 text-right text-slate-200 text-sm">{formatRupiah(item.totalPrice)}</td>
                                                )}
                                                <td className="py-2.5 pr-3">
                                                    {item.soCode
                                                        ? <span className="font-mono text-xs text-emerald-300">{item.soCode}</span>
                                                        : <SoStatusBadge status={item.soStatus} />}
                                                </td>
                                                <td className="py-2.5 text-xs text-slate-400">
                                                    {(item.soGudang ?? []).length > 0 ? item.soGudang.join(', ') : '—'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </Card>
                    )}
                </div>
            </div>

            {/* ── Mitra Transportir ── */}
            <Card title="Alokasi Mitra Transportir">
                <TransportAssignmentSection order={order} canManage={canManageTransportPartner} onUpdated={reload} />
            </Card>

            {/* ── Pengiriman ── */}
            <Card title="Pengiriman & Dokumen">
                {shipments.length === 0 ? (
                    <p className="text-sm italic text-slate-500">Sopir & truk belum dialokasikan oleh Admin Transport.</p>
                ) : (
                    <>
                        <DeliverySummary shipments={shipments} />
                        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                            {shipments.map((s, index) => (
                                <div key={s.id} className="rounded-xl border border-white/8 bg-white/3 p-4">
                                    <div className="mb-3 flex items-start justify-between gap-2">
                                        <div>
                                            <p className="text-sm font-semibold text-white">
                                                Truk {index + 1} · {s.productName}
                                            </p>
                                            <p className="text-xs text-slate-500">{s.quotaTon} Ton{s.productCode ? ` · ${s.productCode}` : ''}</p>
                                        </div>
                                        <span className="shrink-0 rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-xs text-slate-300">
                                            {SHIPMENT_STATUS_LABEL[s.status] ?? s.status}
                                        </span>
                                    </div>

                                    {s.status !== 'belum_ditugaskan' && (
                                        <InfoGrid rows={[
                                            ['Mitra',      s.companyName],
                                            ['Sopir',      s.driverName],
                                            ['Kendaraan',  [s.truckLabel, s.policeNumber ? `(${s.policeNumber})` : ''].filter(Boolean).join(' ') || null],
                                            ['Load-In',    formatDate(s.muatInAt)],
                                            ['Load-Out',   formatDate(s.muatOutAt)],
                                        ]} />
                                    )}

                                    {(s.muatInPhotoUrl || s.muatOutPhotoUrl) && (
                                        <div className="mt-3 grid grid-cols-2 gap-3">
                                            {s.muatInPhotoUrl && (
                                                <div>
                                                    <p className="mb-1 text-[10px] uppercase tracking-[0.15em] text-slate-500">Foto Load-In</p>
                                                    <img src={s.muatInPhotoUrl} alt="Load-In" className="rounded-lg border border-white/10 w-full" />
                                                </div>
                                            )}
                                            {s.muatOutPhotoUrl && (
                                                <div>
                                                    <p className="mb-1 text-[10px] uppercase tracking-[0.15em] text-slate-500">Foto Load-Out</p>
                                                    <img src={s.muatOutPhotoUrl} alt="Load-Out" className="rounded-lg border border-white/10 w-full" />
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {s.status !== 'belum_ditugaskan' && (canDownloadPengantar || canDownloadDocs) && (
                                        <div className="mt-3 flex flex-wrap gap-2">
                                            {canDownloadPengantar && (
                                                <a href={`/api/admin/shipments/${s.id}/surat-jalan-pengantar`}
                                                    target="_blank" rel="noreferrer"
                                                    className="inline-flex items-center gap-1.5 rounded-lg border border-sky-400/30 bg-sky-400/10 px-3 py-1.5 text-xs font-medium text-sky-300 hover:bg-sky-400/20 transition">
                                                    <Download size={12} /> Surat Jalan
                                                </a>
                                            )}
                                            {canDownloadDocs && (
                                                <a href={`/api/admin/shipments/${s.id}/bptp`}
                                                    target="_blank" rel="noreferrer"
                                                    className="inline-flex items-center gap-1.5 rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-1.5 text-xs font-medium text-amber-300 hover:bg-amber-400/20 transition">
                                                    <Download size={12} /> BPTP
                                                </a>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </Card>

            {cancelOpen && (
                <CancelModal order={order} onClose={() => setCancelOpen(false)} onCancelled={reload} />
            )}
        </div>
    );
}
