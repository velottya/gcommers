import { Search, Star } from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';
import { api } from '../../api/client';
import { Pagination, Table } from '../ui/Table';
import StatusBadge from '../ui/StatusBadge';

function formatRupiah(val) {
    if (val == null) return '—';
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);
}

const COLUMNS = [
    { key: 'productCode', label: 'Kode',     render: r => <span className="font-mono text-xs">{r.productCode}</span> },
    { key: 'name',        label: 'Nama' },
    { key: 'category',    label: 'Kategori' },
    { key: 'price',       label: 'Harga',    render: r => formatRupiah(r.price) },
    { key: 'stock',       label: 'Stok',     render: r => <span className={r.stock <= 0 ? 'text-red-400' : 'text-emerald-400'}>{r.stock}</span> },
    { key: 'minimumOrder',label: 'Min. Order' },
    { key: 'unit',        label: 'Unit' },
    { key: 'rating',      label: 'Rating',   render: r => r.rating ? <span className="flex items-center gap-1"><Star size={12} className="text-amber-400" />{Number(r.rating).toFixed(1)}</span> : '—' },
    { key: 'status',      label: 'Status',   render: r => <StatusBadge value={r.status} /> },
];

export default function ProductList() {
    const [data,       setData]       = useState(null);
    const [loading,    setLoading]    = useState(true);
    const [error,      setError]      = useState(null);
    const [page,       setPage]       = useState(1);
    const [search,     setSearch]     = useState('');
    const [category,   setCategory]   = useState('');
    const [status,     setStatus]     = useState('');
    const [categories, setCategories] = useState([]);
    const [query,      setQuery]      = useState({ search: '', category: '', status: '' });

    useEffect(() => {
        api.get('/products/categories').then(setCategories).catch(() => {});
    }, []);

    const fetchProducts = useCallback(() => {
        setLoading(true);
        api.get('/products', { page, ...query })
            .then(setData)
            .catch(e => setError(e.message))
            .finally(() => setLoading(false));
    }, [page, query]);

    useEffect(() => { fetchProducts(); }, [fetchProducts]);

    function handleSearch(e) {
        e.preventDefault();
        setPage(1);
        setQuery({ search, category, status });
    }

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-semibold text-white">Produk</h1>

            <form onSubmit={handleSearch} className="flex flex-wrap gap-3">
                <div className="relative flex-1 min-w-[200px]">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                        type="text"
                        placeholder="Cari nama atau kode produk…"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full rounded-xl border border-white/10 bg-slate-950/50 pl-9 pr-4 py-2.5 text-sm text-white placeholder-slate-600 outline-none focus:border-amber-400/30 transition"
                    />
                </div>
                {categories.length > 0 && (
                    <select
                        value={category}
                        onChange={e => setCategory(e.target.value)}
                        className="rounded-xl border border-white/10 bg-slate-950/50 px-3 py-2.5 text-sm text-slate-300 outline-none"
                    >
                        <option value="">Semua kategori</option>
                        {categories.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                )}
                <select
                    value={status}
                    onChange={e => setStatus(e.target.value)}
                    className="rounded-xl border border-white/10 bg-slate-950/50 px-3 py-2.5 text-sm text-slate-300 outline-none"
                >
                    <option value="">Semua status</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                </select>
                <button type="submit" className="rounded-xl bg-amber-400 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-amber-300 transition">
                    Cari
                </button>
            </form>

            {error && (
                <div className="rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-300">{error}</div>
            )}

            <Table columns={COLUMNS} data={data?.data} loading={loading} emptyMessage="Tidak ada produk ditemukan." />
            <Pagination meta={data} onPageChange={setPage} />
        </div>
    );
}
