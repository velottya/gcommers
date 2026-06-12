import { Pencil, Plus, Search, Star, Trash2, X } from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import StatusBadge from '../ui/StatusBadge';
import { Pagination, Table } from '../ui/Table';

function formatRupiah(val) {
    if (val == null) return '—';
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);
}

const EMPTY_FORM = {
    productCode: '', name: '', description: '', category: '',
    price: '', stock: '', minimumOrder: '1', unit: 'Kg',
    status: 'Aktif', iconName: '', sourceProductId: '', specification: '',
};

function ProductModal({ product, onClose, onSaved }) {
    const isEdit = !!product?.id;
    const [form,    setForm]    = useState(isEdit ? {
        productCode:    product.productCode    ?? '',
        name:           product.name           ?? '',
        description:    product.description    ?? '',
        category:       product.category       ?? '',
        price:          product.price          ?? '',
        stock:          product.stock          ?? '',
        minimumOrder:   product.minimumOrder   ?? '1',
        unit:           product.unit           ?? 'Kg',
        status:         product.status         ?? 'Aktif',
        iconName:       product.iconName       ?? '',
        sourceProductId:product.sourceProductId?? '',
        specification:  product.specification  ?? '',
    } : { ...EMPTY_FORM });
    const [saving,  setSaving]  = useState(false);
    const [errors,  setErrors]  = useState({});

    function field(key, value) {
        setForm(f => ({ ...f, [key]: value }));
        setErrors(e => ({ ...e, [key]: undefined }));
    }

    async function handleSubmit(e) {
        e.preventDefault();
        setSaving(true);
        setErrors({});
        const body = {
            ...form,
            price:           Number(form.price),
            stock:           Number(form.stock),
            minimumOrder:    Number(form.minimumOrder),
            sourceProductId: form.sourceProductId !== '' ? Number(form.sourceProductId) : null,
        };
        try {
            const saved = isEdit
                ? await api.put(`/products/${product.id}`, body)
                : await api.post('/products', body);
            onSaved(saved);
        } catch (err) {
            if (err.errors) setErrors(err.errors);
            else setErrors({ _global: err.message });
        } finally {
            setSaving(false);
        }
    }

    const inputCls = key =>
        `w-full rounded-xl border ${errors[key] ? 'border-red-400/50' : 'border-white/10'} bg-slate-950/50 px-3 py-2 text-sm text-white placeholder-slate-600 outline-none focus:border-amber-400/40 transition`;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
            <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl">
                <div className="flex items-center justify-between mb-5">
                    <h2 className="text-base font-semibold text-white">
                        {isEdit ? 'Edit Produk' : 'Tambah Produk'}
                    </h2>
                    <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:text-white hover:bg-white/8 transition">
                        <X size={18} />
                    </button>
                </div>

                {errors._global && (
                    <div className="mb-4 rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-300">{errors._global}</div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="mb-1.5 block text-xs text-slate-400">Kode Produk <span className="text-red-400">*</span></label>
                            <input className={inputCls('productCode')} value={form.productCode} onChange={e => field('productCode', e.target.value)} placeholder="mis. PUPUK-001" />
                            {errors.productCode && <p className="mt-1 text-xs text-red-400">{errors.productCode[0]}</p>}
                        </div>
                        <div>
                            <label className="mb-1.5 block text-xs text-slate-400">Kategori <span className="text-red-400">*</span></label>
                            <input className={inputCls('category')} value={form.category} onChange={e => field('category', e.target.value)} placeholder="mis. Pupuk Urea" />
                            {errors.category && <p className="mt-1 text-xs text-red-400">{errors.category[0]}</p>}
                        </div>
                    </div>

                    <div>
                        <label className="mb-1.5 block text-xs text-slate-400">Nama Produk <span className="text-red-400">*</span></label>
                        <input className={inputCls('name')} value={form.name} onChange={e => field('name', e.target.value)} placeholder="Nama lengkap produk" />
                        {errors.name && <p className="mt-1 text-xs text-red-400">{errors.name[0]}</p>}
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <label className="mb-1.5 block text-xs text-slate-400">Harga (Rp) <span className="text-red-400">*</span></label>
                            <input type="number" min="0" className={inputCls('price')} value={form.price} onChange={e => field('price', e.target.value)} placeholder="0" />
                            {errors.price && <p className="mt-1 text-xs text-red-400">{errors.price[0]}</p>}
                        </div>
                        <div>
                            <label className="mb-1.5 block text-xs text-slate-400">Stok <span className="text-red-400">*</span></label>
                            <input type="number" min="0" className={inputCls('stock')} value={form.stock} onChange={e => field('stock', e.target.value)} placeholder="0" />
                            {errors.stock && <p className="mt-1 text-xs text-red-400">{errors.stock[0]}</p>}
                        </div>
                        <div>
                            <label className="mb-1.5 block text-xs text-slate-400">Min. Order <span className="text-red-400">*</span></label>
                            <input type="number" min="1" className={inputCls('minimumOrder')} value={form.minimumOrder} onChange={e => field('minimumOrder', e.target.value)} placeholder="1" />
                            {errors.minimumOrder && <p className="mt-1 text-xs text-red-400">{errors.minimumOrder[0]}</p>}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="mb-1.5 block text-xs text-slate-400">Satuan <span className="text-red-400">*</span></label>
                            <input className={inputCls('unit')} value={form.unit} onChange={e => field('unit', e.target.value)} placeholder="mis. Kg, Sak, Liter" />
                            {errors.unit && <p className="mt-1 text-xs text-red-400">{errors.unit[0]}</p>}
                        </div>
                        <div>
                            <label className="mb-1.5 block text-xs text-slate-400">Status <span className="text-red-400">*</span></label>
                            <select className={inputCls('status')} value={form.status} onChange={e => field('status', e.target.value)}>
                                <option value="Aktif">Aktif</option>
                                <option value="Nonaktif">Nonaktif</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="mb-1.5 block text-xs text-slate-400">Deskripsi</label>
                        <textarea rows={3} className={inputCls('description')} value={form.description} onChange={e => field('description', e.target.value)} placeholder="Deskripsi produk..." />
                    </div>

                    <div>
                        <label className="mb-1.5 block text-xs text-slate-400">Spesifikasi</label>
                        <textarea rows={3} className={inputCls('specification')} value={form.specification} onChange={e => field('specification', e.target.value)} placeholder="Detail spesifikasi teknis..." />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="mb-1.5 block text-xs text-slate-400">Icon Name</label>
                            <input className={inputCls('iconName')} value={form.iconName} onChange={e => field('iconName', e.target.value)} placeholder="nama file ikon" />
                        </div>
                        <div>
                            <label className="mb-1.5 block text-xs text-slate-400">Source Product ID</label>
                            <input type="number" min="1" className={inputCls('sourceProductId')} value={form.sourceProductId} onChange={e => field('sourceProductId', e.target.value)} placeholder="Angka ID dari sistem sumber" />
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                        <button type="button" onClick={onClose} className="rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-400 hover:text-white hover:bg-white/6 transition">
                            Batal
                        </button>
                        <button type="submit" disabled={saving} className="rounded-xl bg-amber-400 px-5 py-2 text-sm font-semibold text-slate-950 hover:bg-amber-300 disabled:opacity-50 transition">
                            {saving ? 'Menyimpan…' : isEdit ? 'Simpan Perubahan' : 'Tambah Produk'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function DeleteConfirm({ product, onClose, onDeleted }) {
    const [deleting, setDeleting] = useState(false);
    const [error,    setError]    = useState(null);

    async function handleDelete() {
        setDeleting(true);
        try {
            await api.del(`/products/${product.id}`);
            onDeleted(product.id);
        } catch (err) {
            setError(err.message);
        } finally {
            setDeleting(false);
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
            <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl">
                <h2 className="mb-2 text-base font-semibold text-white">Hapus Produk?</h2>
                <p className="text-sm text-slate-400 mb-1">
                    Produk <span className="font-semibold text-white">{product.name}</span> akan dihapus permanen dari database.
                </p>
                <p className="text-xs text-red-400 mb-5">Tindakan ini tidak dapat dibatalkan.</p>
                {error && <div className="mb-4 rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-300">{error}</div>}
                <div className="flex justify-end gap-3">
                    <button onClick={onClose} className="rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-400 hover:text-white transition">Batal</button>
                    <button onClick={handleDelete} disabled={deleting} className="rounded-xl bg-red-500 px-4 py-2 text-sm font-semibold text-white hover:bg-red-400 disabled:opacity-50 transition">
                        {deleting ? 'Menghapus…' : 'Ya, Hapus'}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function ProductList({ user }) {
    const navigate      = useNavigate();
    const isSuperAdmin  = user?.role === 'SuperAdmin';

    const [data,       setData]       = useState(null);
    const [loading,    setLoading]    = useState(true);
    const [error,      setError]      = useState(null);
    const [page,       setPage]       = useState(1);
    const [search,     setSearch]     = useState('');
    const [category,   setCategory]   = useState('');
    const [status,     setStatus]     = useState('');
    const [categories, setCategories] = useState([]);
    const [query,      setQuery]      = useState({ search: '', category: '', status: '' });
    const [modal,      setModal]      = useState(null); // null | 'create' | { ...product }
    const [deleteTarget, setDeleteTarget] = useState(null);

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

    function handleSaved(saved) {
        setModal(null);
        fetchProducts();
    }

    function handleDeleted(id) {
        setDeleteTarget(null);
        setData(prev => prev ? { ...prev, data: prev.data.filter(p => p.id !== id) } : prev);
    }

    const COLUMNS = [
        { key: 'productCode', label: 'Kode',      render: r => <span className="font-mono text-xs">{r.productCode}</span> },
        { key: 'name',        label: 'Nama' },
        { key: 'category',    label: 'Kategori' },
        { key: 'price',       label: 'Harga',     render: r => formatRupiah(r.price) },
        { key: 'stock',       label: 'Stok',      render: r => <span className={r.stock <= 0 ? 'text-red-400' : 'text-emerald-400'}>{r.stock}</span> },
        { key: 'minimumOrder',label: 'Min. Order' },
        { key: 'unit',        label: 'Unit' },
        { key: 'rating',      label: 'Rating',    render: r => r.rating ? <span className="flex items-center gap-1"><Star size={12} className="text-amber-400" />{Number(r.rating).toFixed(1)}</span> : '—' },
        { key: 'status',      label: 'Status',    render: r => <StatusBadge value={r.status} /> },
        ...(isSuperAdmin ? [{
            key: '_actions',
            label: '',
            render: r => (
                <div className="flex items-center gap-2 justify-end" onClick={e => e.stopPropagation()}>
                    <button
                        onClick={() => setModal(r)}
                        className="rounded-lg p-1.5 text-slate-400 hover:text-amber-300 hover:bg-white/8 transition"
                        title="Edit"
                    >
                        <Pencil size={14} />
                    </button>
                    <button
                        onClick={() => setDeleteTarget(r)}
                        className="rounded-lg p-1.5 text-slate-400 hover:text-red-400 hover:bg-white/8 transition"
                        title="Hapus"
                    >
                        <Trash2 size={14} />
                    </button>
                </div>
            ),
        }] : []),
    ];

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-semibold text-white">Produk</h1>
                {isSuperAdmin && (
                    <button
                        onClick={() => setModal('create')}
                        className="flex items-center gap-2 rounded-xl bg-amber-400 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-amber-300 transition"
                    >
                        <Plus size={16} />
                        Tambah Produk
                    </button>
                )}
            </div>

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
                    <option value="Aktif">Aktif</option>
                    <option value="Nonaktif">Nonaktif</option>
                </select>
                <button type="submit" className="rounded-xl bg-amber-400 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-amber-300 transition">
                    Cari
                </button>
            </form>

            {error && (
                <div className="rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-300">{error}</div>
            )}

            <Table
                columns={COLUMNS}
                data={data?.data}
                loading={loading}
                emptyMessage="Tidak ada produk ditemukan."
                rowProps={(row) => ({
                    onClick: () => navigate(`/products/${row.id}`),
                    className: 'cursor-pointer hover:bg-white/3 transition',
                })}
            />
            <Pagination meta={data} onPageChange={setPage} />

            {(modal === 'create' || (modal && modal !== 'create')) && (
                <ProductModal
                    product={modal === 'create' ? null : modal}
                    onClose={() => setModal(null)}
                    onSaved={handleSaved}
                />
            )}

            {deleteTarget && (
                <DeleteConfirm
                    product={deleteTarget}
                    onClose={() => setDeleteTarget(null)}
                    onDeleted={handleDeleted}
                />
            )}
        </div>
    );
}
