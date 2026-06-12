import { ArrowLeft, Download } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../../api/client';
import StatusBadge from '../ui/StatusBadge';

function formatRupiah(val) {
    if (val == null) return '—';
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);
}

function formatDate(val) {
    if (!val) return '—';
    return new Date(val).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
}

function InfoRow({ label, value }) {
    return (
        <div className="flex flex-col gap-0.5 sm:flex-row sm:items-center sm:gap-4">
            <dt className="min-w-[140px] text-xs uppercase tracking-[0.2em] text-slate-500">{label}</dt>
            <dd className="text-sm text-slate-200">{value ?? '—'}</dd>
        </div>
    );
}

export default function OrderDetail({ user }) {
    const { id }                    = useParams();
    const navigate                  = useNavigate();
    const [order,   setOrder]       = useState(null);
    const [loading, setLoading]     = useState(true);
    const [error,   setError]       = useState(null);

    const canDownloadBptp = user?.role === 'SuperAdmin' || user?.role === 'AdminRegion';

    useEffect(() => {
        api.get(`/orders/${id}`)
            .then(setOrder)
            .catch(e => setError(e.message))
            .finally(() => setLoading(false));
    }, [id]);

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
            <div className="flex items-center gap-4">
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
                <StatusBadge value={order?.status} />

                {canDownloadBptp && order && (
                    <a
                        href={`/api/admin/orders/${order.id}/bptp`}
                        target="_blank"
                        rel="noreferrer"
                        className="ml-auto flex items-center gap-2 rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-2 text-sm font-semibold text-amber-300 hover:bg-amber-400/20 transition"
                    >
                        <Download size={15} />
                        Unduh BPTP
                    </a>
                )}
            </div>

            {/* Order header */}
            <div className="rounded-2xl border border-white/8 bg-slate-950/55 p-6">
                <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Informasi Order</h2>
                <dl className="space-y-3">
                    <InfoRow label="PO Number"      value={order?.poNumber} />
                    <InfoRow label="Email Pembeli"  value={order?.userEmail} />
                    <InfoRow label="Vendor"         value={order?.vendor} />
                    <InfoRow label="Payment"        value={order?.paymentMethod} />
                    <InfoRow label="Virtual Account" value={order?.virtualAccount} />
                    <InfoRow label="VA Expired"     value={formatDate(order?.vaExpiredAt)} />
                </dl>
            </div>

            {/* Amounts */}
            <div className="rounded-2xl border border-white/8 bg-slate-950/55 p-6">
                <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Rincian Biaya</h2>
                <dl className="space-y-3">
                    <InfoRow label="Subtotal"       value={formatRupiah(order?.subTotal)} />
                    <InfoRow label="Pajak"          value={formatRupiah(order?.taxAmount)} />
                    <InfoRow label="Ongkir"         value={formatRupiah(order?.shippingAmount)} />
                    <InfoRow label="Total"          value={<span className="text-base font-semibold text-amber-300">{formatRupiah(order?.totalAmount)}</span>} />
                </dl>
            </div>

            {/* Timestamps */}
            <div className="rounded-2xl border border-white/8 bg-slate-950/55 p-6">
                <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Timeline</h2>
                <dl className="space-y-3">
                    <InfoRow label="Dibuat"     value={formatDate(order?.createdAt)} />
                    <InfoRow label="Dibayar"    value={formatDate(order?.paidAt)} />
                    <InfoRow label="Dikirim"    value={formatDate(order?.deliveredAt)} />
                    <InfoRow label="Diperbarui" value={formatDate(order?.updatedAt)} />
                </dl>
            </div>

            {/* Order items (if available) */}
            {order?.items?.length > 0 && (
                <div className="rounded-2xl border border-white/8 bg-slate-950/55 p-6">
                    <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Item Order</h2>
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
                </div>
            )}

            {/* Order events (if available) */}
            {order?.events?.length > 0 && (
                <div className="rounded-2xl border border-white/8 bg-slate-950/55 p-6">
                    <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Riwayat Event</h2>
                    <div className="space-y-3">
                        {order.events.map((ev, index) => (
                            <div key={ev.id ?? `${ev.event ?? 'event'}-${index}`} className="flex gap-4">
                                <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-amber-400" />
                                <div>
                                    <p className="text-sm font-medium text-slate-200">{ev.event}</p>
                                    {ev.description && <p className="mt-0.5 text-xs text-slate-400">{ev.description}</p>}
                                    <p className="mt-1 text-xs text-slate-600">{formatDate(ev.createdAt)}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
