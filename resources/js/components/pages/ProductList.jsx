import { Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import StatusBadge from '../ui/StatusBadge';
import { Pagination, Table } from '../ui/Table';

const EMPTY_FORM = {
    kodeProduk: '', namaProduk: '', uraian: '',
    satuan: 'TON', status: 'Aktif', jenis: 'Subsidi', foto: 'nologo.png',
};

// ─── ProductModal ─────────────────────────────────────────────────────────────

function ProductModal({ product, isSuperAdmin, onClose, onSaved }) {
    const isEdit = !!product?.id;
    const [form,   setForm]   = useState(isEdit ? {
        kodeProduk: product.kodeProduk ?? '',
        namaProduk: product.namaProduk ?? '',
        uraian:     product.uraian     ?? '',
        satuan:     product.satuan     ?? 'TON',
        status:     product.status     ?? 'Aktif',
        jenis:      product.jenis      ?? 'Subsidi',
        foto:       product.foto       ?? 'nologo.png',
    } : { ...EMPTY_FORM });
    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState({});

    function field(key, value) {
        setForm(f => ({ ...f, [key]: value }));
        setErrors(e => ({ ...e, [key]: undefined }));
    }

    async function handleSubmit(e) {
        e.preventDefault();
        setSaving(true);
        setErrors({});
        try {
            const saved = isEdit
                ? await api.put(`/products/${product.id}`, form)
                : await api.post('/products', form);
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
    const labelCls = 'mb-1.5 block text-xs text-slate-400';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
            <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl">
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
                            <label className={labelCls}>
                                Kode Produk {!isEdit && <span className="text-red-400">*</span>}
                            </label>
                            <input
                                className={inputCls('kodeProduk')}
                                value={form.kodeProduk}
                                onChange={e => field('kodeProduk', e.target.value)}
                                placeholder="mis. PB01001"
                                readOnly={isEdit}
                                style={isEdit ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                            />
                            {errors.kodeProduk && <p className="mt-1 text-xs text-red-400">{errors.kodeProduk[0]}</p>}
                        </div>
                        <div>
                            <label className={labelCls}>Satuan <span className="text-red-400">*</span></label>
                            <input
                                className={inputCls('satuan')}
                                value={form.satuan}
                                onChange={e => field('satuan', e.target.value)}
                                placeholder="TON"
                            />
                        </div>
                    </div>

                    <div>
                        <label className={labelCls}>Nama Produk <span className="text-red-400">*</span></label>
                        <input
                            className={inputCls('namaProduk')}
                            value={form.namaProduk}
                            onChange={e => field('namaProduk', e.target.value)}
                            placeholder="Nama lengkap produk"
                        />
                        {errors.namaProduk && <p className="mt-1 text-xs text-red-400">{errors.namaProduk[0]}</p>}
                    </div>

                    <div>
                        <label className={labelCls}>Uraian</label>
                        <textarea
                            rows={3}
                            className={inputCls('uraian')}
                            value={form.uraian}
                            onChange={e => field('uraian', e.target.value)}
                            placeholder="Deskripsi singkat produk..."
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className={labelCls}>Jenis <span className="text-red-400">*</span></label>
                            <input
                                className={inputCls('jenis')}
                                value={form.jenis}
                                onChange={e => field('jenis', e.target.value)}
                                placeholder="Subsidi"
                            />
                        </div>
                        <div>
                            <label className={labelCls}>Status <span className="text-red-400">*</span></label>
                            <select
                                className={inputCls('status')}
                                value={form.status}
                                onChange={e => field('status', e.target.value)}
                            >
                                <option value="Aktif">Aktif</option>
                                <option value="Nonaktif">Nonaktif</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className={labelCls}>Foto (nama file)</label>
                        <input
                            className={inputCls('foto')}
                            value={form.foto}
                            onChange={e => field('foto', e.target.value)}
                            placeholder="nologo.png"
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                        <button type="button" onClick={onClose}
                            className="rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-400 hover:text-white hover:bg-white/6 transition">
                            Batal
                        </button>
                        <button type="submit" disabled={saving}
                            className="rounded-xl bg-amber-400 px-5 py-2 text-sm font-semibold text-slate-950 hover:bg-amber-300 disabled:opacity-50 transition">
                            {saving ? 'Menyimpan…' : isEdit ? 'Simpan Perubahan' : 'Tambah Produk'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ─── DeleteConfirm ────────────────────────────────────────────────────────────

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
                    Produk <span className="font-semibold text-white">{product.namaProduk}</span> akan dihapus permanen.
                </p>
                <p className="text-xs text-red-400 mb-5">Tindakan ini tidak dapat dibatalkan.</p>
                {error && <div className="mb-4 rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-300">{error}</div>}
                <div className="flex justify-end gap-3">
                    <button onClick={onClose} className="rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-400 hover:text-white transition">Batal</button>
                    <button onClick={handleDelete} disabled={deleting}
                        className="rounded-xl bg-red-500 px-4 py-2 text-sm font-semibold text-white hover:bg-red-400 disabled:opacity-50 transition">
                        {deleting ? 'Menghapus…' : 'Ya, Hapus'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── ProductList ──────────────────────────────────────────────────────────────

export default function ProductList({ user }) {
    const navigate      = useNavigate();
    const isSuperAdmin  = user?.role === 'SuperAdmin';
    const isAdminRegion = user?.role === 'AdminRegion';

    const [data,         setData]         = useState(null);
    const [loading,      setLoading]      = useState(true);
    const [error,        setError]        = useState(null);
    const [page,         setPage]         = useState(1);
    const [search,       setSearch]       = useState('');
    const [status,       setStatus]       = useState('');
    const [query,        setQuery]        = useState({ search: '', status: '' });
    const [modal,        setModal]        = useState(null); // null | 'create' | { ...product }
    const [deleteTarget, setDeleteTarget] = useState(null);

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
        setQuery({ search, status });
    }

    function handleSaved() {
        setModal(null);
        fetchProducts();
    }

    function handleDeleted(id) {
        setDeleteTarget(null);
        setData(prev => prev ? { ...prev, data: prev.data.filter(p => p.id !== id) } : prev);
    }

    const COLUMNS = [
        { key: 'kodeProduk', label: 'Kode',     render: r => <span className="font-mono text-xs">{r.kodeProduk}</span> },
        {
            key: 'namaProduk',
            label: 'Nama Produk',
            render: r => (
                <div>
                    <p className="font-medium text-white">{r.namaProduk}</p>
                    {r.uraian && <p className="text-xs text-slate-500 mt-0.5 max-w-xs truncate">{r.uraian}</p>}
                </div>
            ),
        },
        { key: 'satuan', label: 'Satuan' },
        { key: 'jenis',  label: 'Jenis' },
        { key: 'status', label: 'Status', render: r => <StatusBadge value={r.status} /> },
        ...((isSuperAdmin || isAdminRegion) ? [{
            key: '_actions',
            label: '',
            render: r => (
                <div className="flex items-center gap-1.5 justify-end" onClick={e => e.stopPropagation()}>
                    <button
                        onClick={() => setModal(r)}
                        className="rounded-lg p-1.5 text-slate-400 hover:text-amber-300 hover:bg-white/8 transition"
                        title="Edit"
                    >
                        <Pencil size={14} />
                    </button>
                    {isSuperAdmin && (
                        <button
                            onClick={() => setDeleteTarget(r)}
                            className="rounded-lg p-1.5 text-slate-400 hover:text-red-400 hover:bg-white/8 transition"
                            title="Hapus"
                        >
                            <Trash2 size={14} />
                        </button>
                    )}
                </div>
            ),
        }] : []),
    ];

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold text-white">Produk</h1>
                    <p className="mt-1 text-sm text-slate-500">Daftar produk pupuk subsidi yang tersedia.</p>
                </div>
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
                rowProps={row => ({
                    onClick: () => navigate(`/products/${row.id}`),
                    className: 'cursor-pointer hover:bg-white/3 transition',
                })}
            />
            <Pagination meta={data} onPageChange={setPage} />

            {(modal === 'create' || (modal && modal !== 'create')) && (
                <ProductModal
                    product={modal === 'create' ? null : modal}
                    isSuperAdmin={isSuperAdmin}
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
