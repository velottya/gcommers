import { Search } from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import { Pagination, Table } from '../ui/Table';
import StatusBadge from '../ui/StatusBadge';

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

const STATUS_OPTIONS = ['', 'pending', 'processing', 'on_delivery', 'delivered', 'cancelled'];

const COLUMNS = (navigate) => [
    { key: 'poNumber',    label: 'PO Number',  render: r => <span className="font-mono text-xs">{orderField(r, 'poNumber', 'PoNumber')}</span> },
    { key: 'userEmail',   label: 'Email',      render: r => orderField(r, 'userEmail', 'UserEmail') },
    { key: 'vendor',      label: 'Vendor',     render: r => orderField(r, 'vendor', 'Vendor') },
    { key: 'totalAmount', label: 'Total',      render: r => formatRupiah(orderField(r, 'totalAmount', 'TotalAmount')) },
    { key: 'status',      label: 'Status',     render: r => <StatusBadge value={orderField(r, 'status', 'Status')} /> },
    { key: 'createdAt',   label: 'Tanggal',    render: r => formatDate(orderField(r, 'createdAt', 'CreatedAt')) },
    {
        key: '_action',
        label: '',
        render: r => (
            <button
                onClick={() => navigate(`/orders/${r.id}`)}
                className="text-xs text-slate-400 hover:text-amber-300 transition"
            >
                Detail →
            </button>
        ),
    },
];

export default function OrderList({ user }) {
    const navigate                  = useNavigate();
    const [data,    setData]        = useState(null);
    const [loading, setLoading]     = useState(true);
    const [error,   setError]       = useState(null);
    const [page,    setPage]        = useState(1);
    const [search,  setSearch]      = useState('');
    const [status,  setStatus]      = useState('');
    const [query,   setQuery]       = useState({ search: '', status: '' });

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
        setQuery({ search, status });
    }

    const pageTitle = user.role === 'AdminTransport' ? 'Assigned Orders' : 'Daftar Order';

    function openDetail(orderId) {
        navigate(`/orders/${orderId}`);
    }

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-semibold text-white">{pageTitle}</h1>

            {/* Filter bar */}
            <form onSubmit={handleSearch} className="flex flex-wrap gap-3">
                <div className="relative flex-1 min-w-[200px]">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                        type="text"
                        placeholder="Cari PO number atau email…"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full rounded-xl border border-white/10 bg-slate-950/50 pl-9 pr-4 py-2.5 text-sm text-white placeholder-slate-600 outline-none focus:border-amber-400/30 transition"
                    />
                </div>
                <select
                    value={status}
                    onChange={e => setStatus(e.target.value)}
                    className="rounded-xl border border-white/10 bg-slate-950/50 px-3 py-2.5 text-sm text-slate-300 outline-none focus:border-amber-400/30 transition"
                >
                    {STATUS_OPTIONS.map(s => (
                        <option key={s} value={s}>{s || 'Semua status'}</option>
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
                columns={COLUMNS(navigate)}
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
    );
}
