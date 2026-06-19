import { ArrowLeft, ChevronDown, ChevronRight, Coins, Plus, Send, Trash2 } from 'lucide-react';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../../api/client';
import { Pagination, Table } from '../ui/Table';

// ─── Konstanta ────────────────────────────────────────────────────────────────

const STATUS_CFG = {
    draft:     { label: 'Draft',     color: 'text-slate-400 bg-slate-400/10 border-slate-400/20' },
    submitted: { label: 'Diajukan', color: 'text-amber-300 bg-amber-400/10 border-amber-400/20' },
    approved:  { label: 'Disetujui', color: 'text-emerald-300 bg-emerald-400/10 border-emerald-400/20' },
    rejected:  { label: 'Ditolak',  color: 'text-red-300 bg-red-400/10 border-red-400/20' },
};

function StatusChip({ value }) {
    const cfg = STATUS_CFG[value] ?? STATUS_CFG.draft;
    return (
        <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${cfg.color}`}>
            {cfg.label}
        </span>
    );
}

function fTon(val) {
    return val == null ? '—' : `${Number(val).toLocaleString('id-ID', { maximumFractionDigits: 2 })} TON`;
}

let _uid = 0;
const nextUid = () => ++_uid;

function emptyProduct() {
    return { _uid: nextUid(), product_id: '', product_code: '', product_name: '', total_qty_ton: '', kecamatan_allocations: [] };
}

function emptyAlloc() {
    return { _uid: nextUid(), kecamatan: '', qty_ton: '' };
}

// ─── Shared UI primitives ─────────────────────────────────────────────────────

function Inp({ error, className = '', ...props }) {
    return (
        <input
            className={`w-full rounded-xl border bg-slate-900 px-3 py-2 text-sm text-white outline-none transition
                ${error ? 'border-red-400/60' : 'border-white/10 focus:border-amber-400/40'} ${className}`}
            {...props}
        />
    );
}

function Sel({ error, className = '', children, ...props }) {
    return (
        <select
            className={`w-full rounded-xl border bg-slate-900 px-3 py-2 text-sm text-white outline-none transition
                ${error ? 'border-red-400/60' : 'border-white/10 focus:border-amber-400/40'} ${className}`}
            {...props}
        >
            {children}
        </select>
    );
}

function ErrBanner({ msg }) {
    if (!msg) return null;
    return (
        <div className="rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-300">{msg}</div>
    );
}

// ─── ProductRow (dalam form edit) ─────────────────────────────────────────────

function ProductRow({ p, kecamatanList, onChange, onRemove, readOnly }) {
    const [open, setOpen] = useState(true);

    const allocated = p.kecamatan_allocations.reduce((s, k) => s + (parseFloat(k.qty_ton) || 0), 0);
    const total     = parseFloat(p.total_qty_ton) || 0;
    const remaining = total - allocated;
    const overAllocated = remaining < -0.001;

    // Kecamatan yang belum dialokasikan untuk produk ini
    const usedKecamatan = new Set(p.kecamatan_allocations.map(k => k.kecamatan));
    const availKecamatan = kecamatanList.filter(k => !usedKecamatan.has(k));

    function addKecamatan() {
        if (!availKecamatan.length) return;
        onChange({
            ...p,
            kecamatan_allocations: [
                ...p.kecamatan_allocations,
                { ...emptyAlloc(), kecamatan: availKecamatan[0] },
            ],
        });
    }

    function updateKecamatan(uid, field, value) {
        onChange({
            ...p,
            kecamatan_allocations: p.kecamatan_allocations.map(k =>
                k._uid === uid ? { ...k, [field]: value } : k
            ),
        });
    }

    function removeKecamatan(uid) {
        onChange({ ...p, kecamatan_allocations: p.kecamatan_allocations.filter(k => k._uid !== uid) });
    }

    return (
        <div className="rounded-2xl border border-white/10 bg-slate-900/60 overflow-hidden">
            {/* Header produk */}
            <div className="flex items-center gap-3 px-4 py-3">
                <button type="button" onClick={() => setOpen(o => !o)}
                    className="text-slate-400 hover:text-white transition">
                    {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </button>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{p.product_name}</p>
                    <p className="text-xs text-slate-500 font-mono">{p.product_code}</p>
                </div>
                {!readOnly && (
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                            <label className="text-xs text-slate-400 whitespace-nowrap">Total quota (TON)</label>
                            <Inp type="number" min="0.01" step="0.01" value={p.total_qty_ton} className="w-28"
                                onChange={e => onChange({ ...p, total_qty_ton: e.target.value })} />
                        </div>
                        <button type="button" onClick={onRemove}
                            className="rounded-lg p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-400/10 transition">
                            <Trash2 size={15} />
                        </button>
                    </div>
                )}
                {readOnly && (
                    <span className="text-sm font-semibold text-amber-300">{fTon(p.total_qty_ton)}</span>
                )}
            </div>

            {/* Kecamatan allocations */}
            {open && (
                <div className="border-t border-white/8 px-4 pb-4 pt-3 space-y-3">
                    <div className="flex items-center justify-between">
                        <p className="text-xs font-medium text-slate-400">Alokasi per Kecamatan</p>
                        {!readOnly && (
                            <div className="flex items-center gap-3">
                                {total > 0 && (
                                    <span className={`text-xs font-mono ${overAllocated ? 'text-red-400' : 'text-slate-500'}`}>
                                        {overAllocated ? '⚠ ' : ''}Dialokasikan: {fTon(allocated)} / {fTon(total)}
                                        {!overAllocated && remaining > 0.001 && ` · sisa ${fTon(remaining)}`}
                                    </span>
                                )}
                                <button type="button" onClick={addKecamatan} disabled={!availKecamatan.length}
                                    className="flex items-center gap-1 rounded-lg border border-teal-400/30 bg-teal-400/10 px-2.5 py-1.5 text-xs text-teal-300 hover:bg-teal-400/20 disabled:opacity-40 disabled:cursor-not-allowed transition">
                                    <Plus size={11} /> Tambah Kecamatan
                                </button>
                            </div>
                        )}
                    </div>

                    {p.kecamatan_allocations.length === 0 ? (
                        <p className="text-xs text-slate-600 italic py-2">Belum ada kecamatan yang dialokasikan.</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="text-xs text-slate-500 border-b border-white/8">
                                        <th className="text-left pb-2 font-medium">Kecamatan</th>
                                        <th className="text-left pb-2 font-medium w-36">Qty (TON)</th>
                                        {!readOnly && <th className="w-8" />}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {p.kecamatan_allocations.map(k => (
                                        <tr key={k._uid}>
                                            <td className="py-2 pr-3">
                                                {readOnly ? (
                                                    <p className="text-white">{k.kecamatan}</p>
                                                ) : (
                                                    <Sel value={k.kecamatan}
                                                        onChange={e => updateKecamatan(k._uid, 'kecamatan', e.target.value)}>
                                                        {/* Opsi untuk kecamatan ini sendiri + yang belum terpakai */}
                                                        {kecamatanList.filter(kk =>
                                                            kk === k.kecamatan || !usedKecamatan.has(kk)
                                                        ).map(kk => (
                                                            <option key={kk} value={kk}>{kk}</option>
                                                        ))}
                                                    </Sel>
                                                )}
                                            </td>
                                            <td className="py-2 pr-3">
                                                {readOnly ? (
                                                    <span className="font-mono text-white">{fTon(k.qty_ton)}</span>
                                                ) : (
                                                    <Inp type="number" min="0.01" step="0.01" value={k.qty_ton}
                                                        onChange={e => updateKecamatan(k._uid, 'qty_ton', e.target.value)} />
                                                )}
                                            </td>
                                            {!readOnly && (
                                                <td className="py-2">
                                                    <button type="button" onClick={() => removeKecamatan(k._uid)}
                                                        className="rounded-lg p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-400/10 transition">
                                                        <Trash2 size={13} />
                                                    </button>
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// ─── FormView ─────────────────────────────────────────────────────────────────

function FormView({ editId, userRegion, onBack, onSaved }) {
    const [formYear,     setFormYear]     = useState(new Date().getFullYear());
    const [formNotes,    setFormNotes]    = useState('');
    const [formProducts, setFormProducts] = useState([]);
    const [products,     setProducts]     = useState([]);
    const [kecamatanList, setKecamatanList] = useState([]);
    const [refLoading,   setRefLoading]   = useState(true);
    const [saving,       setSaving]       = useState(false);
    const [submitting,   setSubmitting]   = useState(false);
    const [error,        setError]        = useState(null);
    const isEdit = Boolean(editId);

    // Produk yang belum ditambahkan ke form
    const usedProductIds = new Set(formProducts.map(p => String(p.product_id)));
    const availProducts  = products.filter(p => !usedProductIds.has(String(p.id)));

    // Load reference data + detail jika edit
    useEffect(() => {
        setRefLoading(true);
        const tasks = [
            api.get('/products', { status: 'Aktif', per_page: 100 }),
            api.get('/quota-subsidi/kecamatan'),
        ];
        if (editId) tasks.push(api.get(`/quota-subsidi/${editId}`));

        Promise.all(tasks)
            .then(([prodRes, kecamatanRes, detailRes]) => {
                setProducts(Array.isArray(prodRes) ? prodRes : (prodRes.data ?? []));
                setKecamatanList(kecamatanRes ?? []);

                if (detailRes) {
                    setFormYear(detailRes.year ?? new Date().getFullYear());
                    setFormNotes(detailRes.notes ?? '');
                    setFormProducts((detailRes.products ?? []).map(p => ({
                        _uid: nextUid(),
                        product_id:   p.product_id,
                        product_code: p.product_code,
                        product_name: p.product_name,
                        total_qty_ton: String(p.total_qty_ton),
                        kecamatan_allocations: (p.kecamatan_allocations ?? []).map(k => ({
                            _uid:      nextUid(),
                            kecamatan: k.kecamatan,
                            qty_ton:   String(k.qty_ton),
                        })),
                    })));
                }
            })
            .catch(e => setError(e.message || 'Gagal memuat data.'))
            .finally(() => setRefLoading(false));
    }, [editId]);

    function addProduct(e) {
        const productId = e.target.value;
        if (!productId) return;
        const found = products.find(p => String(p.id) === productId);
        if (!found) return;
        setFormProducts(ps => [...ps, {
            ...emptyProduct(),
            product_id:   found.id,
            product_code: found.kodeProduk ?? found.kode_produk ?? '',
            product_name: found.namaProduk ?? found.nama_produk ?? '',
        }]);
        e.target.value = '';
    }

    function updateProduct(uid, newP) {
        setFormProducts(ps => ps.map(p => p._uid === uid ? newP : p));
    }

    function removeProduct(uid) {
        setFormProducts(ps => ps.filter(p => p._uid !== uid));
    }

    function buildPayload() {
        return {
            year:  formYear,
            notes: formNotes || null,
            products: formProducts.map(p => ({
                product_id:            p.product_id,
                total_qty_ton:         parseFloat(p.total_qty_ton),
                kecamatan_allocations: p.kecamatan_allocations.map(k => ({
                    kecamatan: k.kecamatan,
                    qty_ton:   parseFloat(k.qty_ton),
                })),
            })),
        };
    }

    async function handleSave(e) {
        e.preventDefault();
        setSaving(true);
        setError(null);
        try {
            if (isEdit) {
                await api.put(`/quota-subsidi/${editId}`, buildPayload());
            } else {
                await api.post('/quota-subsidi', buildPayload());
            }
            onSaved();
        } catch (err) {
            setError(err.message || 'Gagal menyimpan.');
        } finally {
            setSaving(false);
        }
    }

    async function handleSubmit() {
        if (!isEdit) return;
        setSubmitting(true);
        setError(null);
        try {
            // Simpan dulu, lalu ajukan
            await api.put(`/quota-subsidi/${editId}`, buildPayload());
            await api.post(`/quota-subsidi/${editId}/submit`);
            onSaved();
        } catch (err) {
            setError(err.message || 'Gagal mengajukan.');
        } finally {
            setSubmitting(false);
        }
    }

    if (refLoading) {
        return (
            <div className="flex items-center justify-center py-24">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-400 border-t-transparent" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Back + title */}
            <div>
                <button type="button" onClick={onBack}
                    className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition mb-4">
                    <ArrowLeft size={16} /> Kembali ke Daftar
                </button>
                <h1 className="text-2xl font-semibold text-white">
                    {isEdit ? 'Edit Ajuan Quota' : 'Buat Ajuan Quota Subsidi'}
                </h1>
                <p className="mt-1 text-sm text-slate-500">Region: <span className="text-white">{userRegion}</span></p>
            </div>

            <ErrBanner msg={error} />

            <form onSubmit={handleSave} className="space-y-6">
                {/* Header fields */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <label className="block text-xs font-medium text-slate-400">Tahun</label>
                        <Inp type="number" min="2024" max="2100" value={formYear}
                            onChange={e => setFormYear(parseInt(e.target.value, 10))} />
                    </div>
                    <div className="space-y-1">
                        <label className="block text-xs font-medium text-slate-400">Catatan (opsional)</label>
                        <Inp type="text" value={formNotes} onChange={e => setFormNotes(e.target.value)}
                            placeholder="Keterangan tambahan…" />
                    </div>
                </div>

                {/* Products */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h2 className="text-sm font-semibold text-slate-200">Alokasi per Produk</h2>
                        <div className="flex items-center gap-2">
                            <Sel onChange={addProduct} className="w-56"
                                disabled={!availProducts.length}>
                                <option value="">{availProducts.length ? '+ Tambah Produk…' : 'Semua produk sudah ditambahkan'}</option>
                                {availProducts.map(p => (
                                    <option key={p.id} value={p.id}>
                                        {p.namaProduk ?? p.nama_produk}
                                    </option>
                                ))}
                            </Sel>
                        </div>
                    </div>

                    {formProducts.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-white/10 py-10 text-center">
                            <Coins size={24} className="mx-auto mb-2 text-slate-600" />
                            <p className="text-sm text-slate-500">Belum ada produk. Pilih produk di atas untuk mulai.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {formProducts.map(p => (
                                <ProductRow key={p._uid} p={p} kecamatanList={kecamatanList}
                                    onChange={newP => updateProduct(p._uid, newP)}
                                    onRemove={() => removeProduct(p._uid)}
                                    readOnly={false} />
                            ))}
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 border-t border-white/8 pt-5">
                    <button type="button" onClick={onBack}
                        className="rounded-xl border border-white/10 px-5 py-2.5 text-sm text-slate-400 hover:text-white transition">
                        Batal
                    </button>
                    <button type="submit" disabled={saving || submitting || formProducts.length === 0}
                        className="rounded-xl border border-slate-600 bg-slate-800 px-5 py-2.5 text-sm text-slate-200 hover:bg-slate-700 disabled:opacity-50 transition">
                        {saving ? 'Menyimpan…' : 'Simpan Draft'}
                    </button>
                    {isEdit && (
                        <button type="button" onClick={handleSubmit}
                            disabled={saving || submitting || formProducts.length === 0}
                            className="flex items-center gap-2 rounded-xl bg-amber-400 px-5 py-2.5 text-sm font-semibold text-slate-950 hover:bg-amber-300 disabled:opacity-50 transition">
                            <Send size={14} />
                            {submitting ? 'Mengajukan…' : 'Ajukan ke SuperAdmin'}
                        </button>
                    )}
                </div>
            </form>
        </div>
    );
}

// ─── DetailView (read-only) ───────────────────────────────────────────────────

function DetailView({ submissionId, userRole, onBack, onEdit, onSubmitted }) {
    const [detail,   setDetail]   = useState(null);
    const [loading,  setLoading]  = useState(true);
    const [error,    setError]    = useState(null);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        setLoading(true);
        api.get(`/quota-subsidi/${submissionId}`)
            .then(setDetail)
            .catch(e => setError(e.message))
            .finally(() => setLoading(false));
    }, [submissionId]);

    async function handleSubmit() {
        setSubmitting(true);
        try {
            await api.post(`/quota-subsidi/${submissionId}/submit`);
            onSubmitted?.();
        } catch (err) {
            setError(err.message || 'Gagal mengajukan.');
        } finally {
            setSubmitting(false);
        }
    }

    if (loading) return (
        <div className="flex items-center justify-center py-24">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-400 border-t-transparent" />
        </div>
    );

    return (
        <div className="space-y-6">
            <div>
                <button type="button" onClick={onBack}
                    className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition mb-4">
                    <ArrowLeft size={16} /> Kembali ke Daftar
                </button>
                <div className="flex items-start justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold text-white">
                            Quota Subsidi {detail?.year} — {detail?.region}
                        </h1>
                        <div className="mt-1 flex items-center gap-3">
                            <StatusChip value={detail?.status} />
                            <span className="text-sm text-slate-500">
                                Diajukan oleh {detail?.submitted_by}
                            </span>
                        </div>
                    </div>
                    {userRole === 'AdminRegion' && detail?.status === 'draft' && (
                        <div className="flex items-center gap-2">
                            <button onClick={onEdit}
                                className="rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-300 hover:text-white hover:bg-white/5 transition">
                                Edit
                            </button>
                            <button onClick={handleSubmit} disabled={submitting}
                                className="flex items-center gap-2 rounded-xl bg-amber-400 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-amber-300 disabled:opacity-50 transition">
                                <Send size={14} />
                                {submitting ? 'Mengajukan…' : 'Ajukan ke SuperAdmin'}
                            </button>
                        </div>
                    )}
                    {userRole === 'AdminRegion' && detail?.status === 'rejected' && (
                        <button onClick={onEdit}
                            className="rounded-xl bg-amber-400/20 border border-amber-400/30 px-4 py-2 text-sm font-semibold text-amber-300 hover:bg-amber-400/30 transition">
                            Revisi & Ajukan Ulang
                        </button>
                    )}
                </div>
            </div>

            <ErrBanner msg={error} />

            {/* Info card */}
            {(detail?.notes || detail?.review_note) && (
                <div className="grid gap-3 sm:grid-cols-2">
                    {detail.notes && (
                        <div className="rounded-xl border border-white/8 bg-white/3 px-4 py-3">
                            <p className="text-xs text-slate-500 mb-1">Catatan</p>
                            <p className="text-sm text-slate-300">{detail.notes}</p>
                        </div>
                    )}
                    {detail.review_note && (
                        <div className={`rounded-xl border px-4 py-3 ${
                            detail.status === 'approved'
                                ? 'border-emerald-400/20 bg-emerald-400/5'
                                : 'border-red-400/20 bg-red-400/5'
                        }`}>
                            <p className="text-xs text-slate-500 mb-1">
                                Catatan SuperAdmin ({detail.reviewed_by})
                            </p>
                            <p className={`text-sm ${detail.status === 'approved' ? 'text-emerald-300' : 'text-red-300'}`}>
                                {detail.review_note}
                            </p>
                        </div>
                    )}
                </div>
            )}

            {/* Products */}
            <div className="space-y-3">
                <h2 className="text-sm font-semibold text-slate-200">Alokasi per Produk ({detail?.products?.length ?? 0} produk)</h2>
                {(detail?.products ?? []).map(p => (
                    <ProductRow key={p.id} p={{
                        _uid: p.id,
                        product_id:   p.product_id,
                        product_code: p.product_code,
                        product_name: p.product_name,
                        total_qty_ton: p.total_qty_ton,
                        kecamatan_allocations: (p.kecamatan_allocations ?? []).map(k => ({
                            _uid:      k.id,
                            kecamatan: k.kecamatan,
                            qty_ton:   k.qty_ton,
                        })),
                    }} kecamatanList={[]} onChange={() => {}} onRemove={() => {}} readOnly={true} />
                ))}
            </div>
        </div>
    );
}

// ─── ListView ─────────────────────────────────────────────────────────────────

function ListView({ user, onNew, onEdit, onView }) {
    const isAdminRegion = user?.role === 'AdminRegion';
    const isSuperAdmin  = user?.role === 'SuperAdmin';

    const [data,       setData]       = useState(null);
    const [loading,    setLoading]    = useState(true);
    const [error,      setError]      = useState(null);
    const [page,       setPage]       = useState(1);
    const [yearFilter, setYearFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [activeFilters, setActiveFilters] = useState({});

    const fetch = useCallback(() => {
        setLoading(true);
        api.get('/quota-subsidi', { page, ...activeFilters })
            .then(setData)
            .catch(e => setError(e.message))
            .finally(() => setLoading(false));
    }, [page, activeFilters]);

    useEffect(() => { fetch(); }, [fetch]);

    async function handleDelete(id) {
        if (!confirm('Hapus ajuan quota ini?')) return;
        try {
            await api.del(`/quota-subsidi/${id}`);
            fetch();
        } catch (err) {
            alert(err.message || 'Gagal menghapus.');
        }
    }

    async function handleSubmitDirect(id) {
        try {
            await api.post(`/quota-subsidi/${id}/submit`);
            fetch();
        } catch (err) {
            alert(err.message || 'Gagal mengajukan.');
        }
    }

    const columns = [
        { key: 'year', label: 'Tahun', render: r => <span className="font-semibold text-white">{r.year}</span> },
        ...(isSuperAdmin ? [{ key: 'region', label: 'Region' }] : []),
        { key: 'status',         label: 'Status',   render: r => <StatusChip value={r.status} /> },
        { key: 'products_count', label: 'Produk',   render: r => <span className="text-xs font-mono">{r.products_count} produk</span> },
        {
            key: 'created_at', label: 'Tanggal Diajukan',
            render: r => <span className="text-xs text-slate-400">{r.created_at ? new Date(r.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</span>,
        },
        { key: 'submitted_by',   label: 'Diajukan Oleh', render: r => <span className="text-xs text-slate-400 truncate block max-w-[140px]">{r.submitted_by}</span> },
        {
            key: 'review_note', label: 'Catatan Review',
            render: r => r.review_note
                ? <span className="text-xs text-slate-400 max-w-[140px] truncate block" title={r.review_note}>{r.review_note}</span>
                : null,
        },
        {
            key: '_act', label: '',
            render: r => (
                <div className="flex items-center gap-1.5 justify-end">
                    <button onClick={() => onView(r.id)}
                        className="rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-slate-300 hover:text-white hover:bg-white/5 transition">
                        Lihat
                    </button>
                    {isAdminRegion && (r.status === 'draft' || r.status === 'rejected') && (
                        <button onClick={() => onEdit(r.id)}
                            className="rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-slate-300 hover:text-white hover:bg-white/5 transition">
                            Edit
                        </button>
                    )}
                    {isAdminRegion && r.status === 'draft' && (
                        <>
                            <button onClick={() => handleSubmitDirect(r.id)}
                                className="flex items-center gap-1 rounded-lg border border-amber-400/30 bg-amber-400/10 px-2.5 py-1.5 text-xs text-amber-300 hover:bg-amber-400/20 transition">
                                <Send size={11} /> Ajukan
                            </button>
                            <button onClick={() => handleDelete(r.id)}
                                className="rounded-lg p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-400/10 transition">
                                <Trash2 size={14} />
                            </button>
                        </>
                    )}
                </div>
            ),
        },
    ];

    return (
        <div className="space-y-6">
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-2xl font-semibold text-white">Alokasi Quota Subsidi</h1>
                    <p className="mt-1 text-sm text-slate-500">
                        {isAdminRegion
                            ? `Kelola quota pupuk subsidi tahunan per kecamatan di region ${user.region}.`
                            : 'Pantau quota pupuk subsidi dari semua region.'}
                    </p>
                </div>
                {isAdminRegion && (
                    <button onClick={onNew}
                        className="flex items-center gap-2 rounded-xl bg-amber-400 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-amber-300 transition">
                        <Plus size={15} /> Buat Ajuan Baru
                    </button>
                )}
            </div>

            <form onSubmit={e => {
                e.preventDefault();
                setPage(1);
                setActiveFilters({
                    ...(yearFilter ? { year: yearFilter } : {}),
                    ...(statusFilter ? { status: statusFilter } : {}),
                    ...(dateFrom ? { date_from: dateFrom } : {}),
                    ...(dateTo ? { date_to: dateTo } : {}),
                });
            }}
                className="flex flex-wrap items-center gap-3">
                <input type="number" placeholder="Tahun" value={yearFilter} onChange={e => setYearFilter(e.target.value)} min="2024" max="2100"
                    className="w-28 rounded-xl border border-white/10 bg-slate-950/50 px-3 py-2.5 text-sm text-slate-300 outline-none focus:border-amber-400/30 transition" />
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                    className="rounded-xl border border-white/10 bg-slate-950/50 px-3 py-2.5 text-sm text-slate-300 outline-none focus:border-amber-400/30 transition">
                    <option value="">Semua status</option>
                    <option value="draft">Draft</option>
                    <option value="submitted">Diajukan</option>
                    <option value="approved">Disetujui</option>
                    <option value="rejected">Ditolak</option>
                </select>
                <div className="flex items-center gap-2">
                    <label className="text-xs text-slate-500">Dari</label>
                    <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                        className="rounded-xl border border-white/10 bg-slate-950/50 px-3 py-2.5 text-sm text-slate-300 outline-none focus:border-amber-400/30 transition" />
                </div>
                <div className="flex items-center gap-2">
                    <label className="text-xs text-slate-500">Sampai</label>
                    <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                        className="rounded-xl border border-white/10 bg-slate-950/50 px-3 py-2.5 text-sm text-slate-300 outline-none focus:border-amber-400/30 transition" />
                </div>
                <button type="submit"
                    className="rounded-xl border border-white/10 bg-slate-800 px-4 py-2.5 text-sm text-slate-300 hover:text-white transition">
                    Filter
                </button>
                {(yearFilter || statusFilter || dateFrom || dateTo) && (
                    <button type="button" onClick={() => {
                        setYearFilter(''); setStatusFilter(''); setDateFrom(''); setDateTo('');
                        setActiveFilters({}); setPage(1);
                    }}
                        className="rounded-xl border border-white/10 px-3 py-2.5 text-sm text-slate-500 hover:text-white transition">
                        Reset
                    </button>
                )}
            </form>

            <ErrBanner msg={error} />

            <Table columns={columns} data={data?.data} loading={loading} emptyMessage="Belum ada ajuan quota subsidi." />
            <Pagination meta={data} onPageChange={setPage} />
        </div>
    );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function QuotaSubsidi({ user }) {
    const [view,   setView]   = useState('list'); // 'list' | 'form' | 'detail'
    const [editId, setEditId] = useState(null);   // null = new, number = edit
    const [viewId, setViewId] = useState(null);

    function handleNew()       { setEditId(null); setView('form'); }
    function handleEdit(id)    { setEditId(id);   setView('form'); }
    function handleView(id)    { setViewId(id);   setView('detail'); }
    function handleBack()      { setView('list'); setEditId(null); setViewId(null); }
    function handleSaved()     { setView('list'); setEditId(null); }
    function handleSubmitted() { setView('list'); setViewId(null); }

    if (view === 'form') {
        return (
            <FormView
                editId={editId}
                userRegion={user?.region}
                onBack={handleBack}
                onSaved={handleSaved}
            />
        );
    }

    if (view === 'detail') {
        return (
            <DetailView
                submissionId={viewId}
                userRole={user?.role}
                onBack={handleBack}
                onEdit={() => handleEdit(viewId)}
                onSubmitted={handleSubmitted}
            />
        );
    }

    return (
        <ListView
            user={user}
            onNew={handleNew}
            onEdit={handleEdit}
            onView={handleView}
        />
    );
}
