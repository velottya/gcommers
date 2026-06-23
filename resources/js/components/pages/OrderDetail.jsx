import { ArrowLeft, Ban, Download } from 'lucide-react';
import React, { useEffect, useState } from 'react';
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

    const canDownloadDocs = user?.role === 'SuperAdmin' || user?.role === 'AdminRegion';
    const canManageGudang = user?.role === 'AdminRegion';
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
                <PaymentStatusBadge value={order?.paymentStatus} />
                <OrderStatusBadge value={order?.orderStatus} />
                <GudangStatusBadge hasGudang={Boolean(order?.gudang)} paymentStatus={order?.paymentStatus} />

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
                    {canDownloadDocs && order?.shipment && (
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
                        <InfoRow label="Email Pembeli"  value={order?.userEmail} />
                        <InfoRow label="Vendor"         value={order?.vendor} />
                        <InfoRow label="Payment"        value={order?.paymentMethod} />
                        <InfoRow label="Virtual Account" value={order?.virtualAccount} />
                        <InfoRow label="VA Expired"     value={formatDate(order?.vaExpiredAt)} />
                    </dl>
                </Section>

                <Section title="Rincian Biaya">
                    <dl className="space-y-3">
                        <InfoRow label="Subtotal"       value={formatRupiah(order?.subTotal)} />
                        <InfoRow label="Pajak"          value={formatRupiah(order?.taxAmount)} />
                        <InfoRow label="Ongkir"         value={formatRupiah(order?.shippingAmount)} />
                        <InfoRow label="Total"          value={<span className="text-base font-semibold text-amber-300">{formatRupiah(order?.totalAmount)}</span>} />
                    </dl>
                </Section>

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

                <Section title="Gudang Pengiriman">
                    <GudangSection order={order} canManage={canManageGudang} onUpdated={reload} />
                </Section>

                {order?.shipment && (
                    <Section title={`Pengiriman — ${SHIPMENT_STATUS_LABEL[order.shipment.status] ?? order.shipment.status}`}>
                        <dl className="space-y-3">
                            <InfoRow label="Sopir"        value={order.shipment.driverName} />
                            <InfoRow label="Transportir"  value={order.shipment.transportirEmail} />
                            <InfoRow label="Kendaraan"    value={`${order.shipment.truckLabel ?? '—'} ${order.shipment.policeNumber ? `(${order.shipment.policeNumber})` : ''}`} />
                            <InfoRow label="Gudang Asal"  value={order.shipment.warehouseName} />
                            <InfoRow label="Tujuan Kios"  value={order.shipment.destinationLabel} />
                            <InfoRow label="Alamat Tujuan" value={order.shipment.destinationAddress} />
                            <InfoRow label="Muat Berangkat (Load-In)" value={formatDate(order.shipment.muatInAt)} />
                            <InfoRow label="Muat Tiba (Load-Out)"     value={formatDate(order.shipment.muatOutAt)} />
                            <InfoRow label="Catatan"      value={order.shipment.note} />
                        </dl>
                        {(order.shipment.muatInPhotoUrl || order.shipment.muatOutPhotoUrl) && (
                            <div className="mt-4 grid grid-cols-2 gap-4">
                                {order.shipment.muatInPhotoUrl && (
                                    <div>
                                        <p className="mb-1 text-xs uppercase tracking-[0.2em] text-slate-500">Foto Load-In</p>
                                        <img src={order.shipment.muatInPhotoUrl} alt="Foto load-in" className="rounded-xl border border-white/10" />
                                    </div>
                                )}
                                {order.shipment.muatOutPhotoUrl && (
                                    <div>
                                        <p className="mb-1 text-xs uppercase tracking-[0.2em] text-slate-500">Foto Load-Out</p>
                                        <img src={order.shipment.muatOutPhotoUrl} alt="Foto load-out" className="rounded-xl border border-white/10" />
                                    </div>
                                )}
                            </div>
                        )}
                    </Section>
                )}

                {order?.items?.length > 0 && (
                    <Section title="Item Order">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-white/8">
                                        {['Produk', 'Qty', 'Harga', 'Subtotal'].map(h => (
                                            <th key={h} className="pb-2 pr-4 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 last:pr-0">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {order.items.map((item, index) => (
                                        <tr key={item.id ?? `${item.productCode ?? item.productName ?? 'item'}-${index}`}>
                                            <td className="py-2.5 pr-4 text-slate-200">{item.productName || item.productCode || '—'}</td>
                                            <td className="py-2.5 pr-4 text-slate-300">{item.quantity}</td>
                                            <td className="py-2.5 pr-4 text-slate-300">{formatRupiah(item.price)}</td>
                                            <td className="py-2.5 text-slate-200">{formatRupiah(item.subtotal)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Section>
                )}
            </div>

            {cancelOpen && (
                <CancelModal order={order} onClose={() => setCancelOpen(false)} onCancelled={reload} />
            )}
        </div>
    );
}
