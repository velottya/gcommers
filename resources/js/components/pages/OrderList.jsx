import { CheckCircle2, Download, Minus, MinusCircle, Search, X } from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import { Pagination, Table } from '../ui/Table';
import { OrderStatusBadge, PaymentStatusBadge } from '../ui/StatusBadge';

function formatRupiah(val) {
    if (val == null) return '—';
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);
}

function formatDate(val) {
    if (!val) return '—';
    return new Date(val).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

function orderField(order, camelKey, pascalKey) {
    return order?.[camelKey] ?? order?.[pascalKey] ?? null;
}

const ORDER_STATUS_OPTIONS = [
    { value: '', label: 'Semua status pemesanan' },
    { value: 'processing', label: 'Sedang Diproses' },
    { value: 'shipping', label: 'Dalam Perjalanan' },
    { value: 'delivered', label: 'Pemesanan Selesai' },
    { value: 'cancelled', label: 'Dibatalkan' },
];

function assignedShipments(row) {
    return (row.shipments ?? []).filter(s => s.status !== 'belum_ditugaskan');
}

function buildColumns(role, onDownloadSuratJalan) {
    const isAdminTransport = role === 'AdminTransport';

    return [
        { key: 'poNumber',  label: 'PO Number', render: r => <span className="font-mono text-xs">{orderField(r, 'poNumber', 'PoNumber')}</span> },
        { key: 'userEmail', label: 'Email',     render: r => orderField(r, 'userEmail', 'UserEmail') },
        { key: 'vendor',    label: 'Vendor',    render: r => orderField(r, 'vendor', 'Vendor') },
        ...(!isAdminTransport ? [
            { key: 'totalAmount',   label: 'Total',      render: r => formatRupiah(orderField(r, 'totalAmount', 'TotalAmount')) },
            { key: 'paymentStatus', label: 'Pembayaran', render: r => <PaymentStatusBadge value={orderField(r, 'paymentStatus', 'PaymentStatus')} /> },
        ] : []),
        { key: 'orderStatus', label: 'Status Pemesanan', render: r => <OrderStatusBadge value={orderField(r, 'orderStatus', 'OrderStatus')} /> },
        {
            key: 'gudang', label: 'Gudang',
            render: r => r.gudang
                ? <CheckCircle2 size={17} className="text-emerald-400" title={r.gudang.namaGudang} />
                : <MinusCircle size={17} className="text-amber-400" title="Gudang belum ditentukan" />,
        },
        {
            key: 'pengiriman', label: 'Pengiriman',
            render: r => r.shippingType
                ? <CheckCircle2 size={17} className="text-emerald-400" title={`Pengiriman ${r.shippingType} sudah diatur`} />
                : <MinusCircle size={17} className="text-amber-400" title="Pengiriman belum diatur" />,
        },
        ...(isAdminTransport ? [{
            key: 'suratJalan', label: 'Surat Jalan',
            render: r => {
                const assigned = assignedShipments(r);
                if (assigned.length === 0) {
                    return <Minus size={17} className="text-slate-500" title="Belum ada surat jalan" />;
                }
                return (
                    <button
                        onClick={e => { e.stopPropagation(); onDownloadSuratJalan(assigned); }}
                        className="rounded-lg p-1.5 text-slate-500 hover:text-sky-400 hover:bg-sky-400/10 transition"
                        title={assigned.length > 1 ? `${assigned.length} surat jalan tersedia` : 'Unduh Surat Jalan'}
                    >
                        <Download size={17} />
                    </button>
                );
            },
        }] : []),
        { key: 'createdAt', label: 'Tanggal', render: r => formatDate(orderField(r, 'createdAt', 'CreatedAt')) },
    ];
}

// Pengiriman Parsial bisa punya beberapa truk yang masing-masing surat jalannya
// terpisah — kalau lebih dari satu, tampilkan pilihan dulu sebelum unduh.
function SuratJalanPreviewModal({ shipments, onClose }) {
    if (!shipments) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={onClose} />
            <div className="relative z-10 w-full max-w-md rounded-2xl border border-white/10 bg-slate-900 shadow-2xl">
                <div className="flex items-center justify-between border-b border-white/8 px-6 py-4">
                    <h2 className="text-base font-semibold text-white">Pilih Surat Jalan</h2>
                    <button onClick={onClose} className="rounded-lg p-1 text-slate-500 hover:text-white transition"><X size={18} /></button>
                </div>
                <div className="space-y-2 px-6 py-5">
                    <p className="mb-2 text-xs text-slate-500">
                        Pengiriman parsial — {shipments.length} truk. Pilih surat jalan yang ingin diunduh:
                    </p>
                    {shipments.map((s, i) => (
                        <a key={s.id}
                            href={`/api/admin/shipments/${s.id}/surat-jalan-pengantar`}
                            target="_blank" rel="noreferrer"
                            className="flex items-center justify-between rounded-xl border border-white/10 bg-white/3 px-4 py-3 text-sm text-slate-200 hover:border-sky-400/30 hover:bg-sky-400/10 transition"
                        >
                            <span>Truk {s.slotIndex ?? i + 1} — {s.productName} ({s.quotaTon} Ton)</span>
                            <Download size={15} className="text-sky-300" />
                        </a>
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

export default function OrderList({ user }) {
    const navigate                  = useNavigate();
    const [data,    setData]        = useState(null);
    const [loading, setLoading]     = useState(true);
    const [error,   setError]       = useState(null);
    const [page,    setPage]        = useState(1);
    const [search,  setSearch]      = useState('');
    const [orderStatus, setOrderStatus] = useState('');
    const [query,   setQuery]       = useState({ search: '', orderStatus: '' });
    const [previewShipments, setPreviewShipments] = useState(null);

    const fetchOrders = useCallback(() => {
        setLoading(true);
        api.get('/orders', { page, ...query })
            .then(setData)
            .catch(e => setError(e.message))
            .finally(() => setLoading(false));
    }, [page, query]);

    useEffect(() => { fetchOrders(); }, [fetchOrders]);

    function handleSearch(e) {
        e.preventDefault();
        setPage(1);
        setQuery({ search, orderStatus });
    }

    const pageTitle = user.role === 'AdminTransport' ? 'Assigned Orders' : 'Daftar Order';

    function handleDownloadSuratJalan(assigned) {
        if (assigned.length === 1) {
            window.open(`/api/admin/shipments/${assigned[0].id}/surat-jalan-pengantar`, '_blank');
        } else {
            setPreviewShipments(assigned);
        }
    }

    const columns = buildColumns(user.role, handleDownloadSuratJalan);

    function openDetail(orderId) {
        navigate(`/orders/${orderId}`);
    }

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-semibold text-white">{pageTitle}</h1>

            <div className="space-y-5 rounded-2xl border border-white/8 bg-slate-950/55 p-6">
                {/* Filter bar */}
                <form onSubmit={handleSearch} className="flex flex-wrap gap-3">
                    <div className="relative flex-1 min-w-[200px]">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                        <input
                            type="text"
                            placeholder="Cari PO number atau email…"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full rounded-xl border border-white/10 bg-slate-900 pl-9 pr-4 py-2.5 text-sm text-white placeholder-slate-600 outline-none focus:border-amber-400/30 transition"
                        />
                    </div>
                    <select
                        value={orderStatus}
                        onChange={e => setOrderStatus(e.target.value)}
                        className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2.5 text-sm text-slate-300 outline-none focus:border-amber-400/30 transition"
                    >
                        {ORDER_STATUS_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                    <button
                        type="submit"
                        className="rounded-xl bg-amber-400 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-amber-300 transition"
                    >
                        Cari
                    </button>
                </form>

                {error && (
                    <div className="rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-300">
                        {error}
                    </div>
                )}

                <Table
                    columns={columns}
                    data={data?.data}
                    loading={loading}
                    emptyMessage="Tidak ada order ditemukan."
                    rowProps={(row) => ({
                        onClick: () => openDetail(row.id),
                        className: 'cursor-pointer hover:bg-white/3 transition',
                    })}
                />

                <Pagination meta={data} onPageChange={setPage} />
            </div>

            <SuratJalanPreviewModal shipments={previewShipments} onClose={() => setPreviewShipments(null)} />
        </div>
    );
}
