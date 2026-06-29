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
                {!hideFinancials && <SoStatusBadge status={order?.soStatus} />}

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
                                        {(hideFinancials ? ['Kode Produk', 'Produk', 'Qty', 'Kode SO', 'Gudang'] : ['Kode Produk', 'Produk', 'Qty', 'Harga', 'Total', 'Kode SO', 'Gudang']).map(h => (
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
                                                    <td className="py-2.5 pr-4 text-slate-200">{formatRupiah(item.totalPrice)}</td>
                                                </>
                                            )}
                                            <td className="py-2.5 pr-4">
                                                {item.soCode ? <span className="font-mono text-xs text-emerald-300">{item.soCode}</span> : <SoStatusBadge status={item.soStatus} />}
                                            </td>
                                            <td className="py-2.5 text-slate-300">
                                                {(item.soGudang ?? []).length > 0 ? item.soGudang.join(', ') : '—'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Section>
                )}

                <Section title="Mitra Transportir per Produk">
                    <TransportAssignmentSection order={order} canManage={canManageTransportPartner} onUpdated={reload} />
                </Section>

                <Section title="Pengiriman">
                    {shipments.length === 0 && (
                        <p className="text-sm italic text-slate-500">Sopir &amp; truk belum dialokasikan oleh Admin Transport.</p>
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
                                        <InfoRow label="Mitra"        value={s.companyName} />
                                        <InfoRow label="Sopir"        value={s.driverName} />
                                        <InfoRow label="Transportir"  value={s.transportirEmail} />
                                        <InfoRow label="Kendaraan"    value={`${s.truckLabel ?? '—'} ${s.policeNumber ? `(${s.policeNumber})` : ''}`} />
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
        </div>
    );
}
