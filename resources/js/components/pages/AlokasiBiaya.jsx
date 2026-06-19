import { ArrowLeft, ChevronDown, ChevronRight, Plus, Send, Trash2, Wallet } from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';
import { api } from '../../api/client';
import { Pagination, Table } from '../ui/Table';

// ─── Konstanta ────────────────────────────────────────────────────────────────

const STATUS_CFG = {
    draft:              { label: 'Draft',              color: 'text-slate-400 bg-slate-400/10 border-slate-400/20' },
    submitted:          { label: 'Diajukan',           color: 'text-amber-300 bg-amber-400/10 border-amber-400/20' },
    approved:           { label: 'Disetujui',          color: 'text-emerald-300 bg-emerald-400/10 border-emerald-400/20' },
    partially_approved: { label: 'Sebagian Disetujui', color: 'text-orange-300 bg-orange-400/10 border-orange-400/20' },
    rejected:           { label: 'Ditolak',            color: 'text-red-300 bg-red-400/10 border-red-400/20' },
};

function StatusChip({ value }) {
    const cfg = STATUS_CFG[value] ?? STATUS_CFG.draft;
    return (
        <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${cfg.color}`}>
            {cfg.label}
        </span>
    );
}

function fRupiah(val) {
    return val == null || val === '' ? '—' : new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);
}

let _uid = 0;
const nextUid = () => ++_uid;

function emptyProduct() {
    return { _uid: nextUid(), product_id: '', product_code: '', product_name: '', rates: [] };
}

function emptyRate() {
    return { _uid: nextUid(), kecamatan: '', harga_satuan: '', biaya_pengiriman: '' };
}

function groupItemsByProduct(items) {
    const map = new Map();
    for (const it of (items ?? [])) {
        if (!map.has(it.product_id)) {
            map.set(it.product_id, {
                _uid: nextUid(),
                product_id:   it.product_id,
                product_code: it.product_code,
                product_name: it.product_name,
                rates: [],
            });
        }
        map.get(it.product_id).rates.push({
            _uid:              nextUid(),
            kecamatan:         it.kecamatan,
            harga_satuan:      String(it.harga_satuan),
            biaya_pengiriman:  String(it.biaya_pengiriman),
            status:            it.status,
        });
    }
    return Array.from(map.values());
}

// ─── Shared UI primitives ─────────────────────────────────────────────────────

function Inp({ error, className = '', ...props }) {
    return (
        <input
            className={`w-full rounded-xl border bg-slate-900 px-3 py-2 text-sm text-white outline-none transition
                ${error ? 'border-red-400/60' : 'border-white/10 focus:border-teal-400/40'} ${className}`}
            {...props}
        />
    );
}

function Sel({ error, className = '', children, ...props }) {
    return (
        <select
            className={`w-full rounded-xl border bg-slate-900 px-3 py-2 text-sm text-white outline-none transition
                ${error ? 'border-red-400/60' : 'border-white/10 focus:border-teal-400/40'} ${className}`}
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

// ─── ProductRateRow (dalam form edit) ─────────────────────────────────────────

function ProductRateRow({ p, kecamatanList, onChange, onRemove, readOnly }) {
    const [open, setOpen] = useState(true);

    const usedKecamatan = new Set(p.rates.map(r => r.kecamatan));
    const availKecamatan = kecamatanList.filter(k => !usedKecamatan.has(k));

    function addRate() {
        if (!availKecamatan.length) return;
        onChange({ ...p, rates: [...p.rates, { ...emptyRate(), kecamatan: availKecamatan[0] }] });
    }

    function updateRate(uid, field, value) {
        onChange({
            ...p,
            rates: p.rates.map(r => r._uid === uid ? { ...r, [field]: value } : r),
        });
    }

    function removeRate(uid) {
        onChange({ ...p, rates: p.rates.filter(r => r._uid !== uid) });
    }

    return (
        <div className="rounded-2xl border border-white/10 bg-slate-900/60 overflow-hidden">
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
                    <button type="button" onClick={onRemove}
                        className="rounded-lg p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-400/10 transition">
                        <Trash2 size={15} />
                    </button>
                )}
            </div>

            {open && (
                <div className="border-t border-white/8 px-4 pb-4 pt-3 space-y-3">
                    <div className="flex items-center justify-between">
                        <p className="text-xs font-medium text-slate-400">Tarif per Kecamatan</p>
                        {!readOnly && (
                            <button type="button" onClick={addRate} disabled={!availKecamatan.length}
                                className="flex items-center gap-1 rounded-lg border border-teal-400/30 bg-teal-400/10 px-2.5 py-1.5 text-xs text-teal-300 hover:bg-teal-400/20 disabled:opacity-40 disabled:cursor-not-allowed transition">
                                <Plus size={11} /> Tambah Kecamatan
                            </button>
                        )}
                    </div>

                    {p.rates.length === 0 ? (
                        <p className="text-xs text-slate-600 italic py-2">Belum ada tarif kecamatan.</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="text-xs text-slate-500 border-b border-white/8">
                                        <th className="text-left pb-2 font-medium">Kecamatan</th>
                                        <th className="text-left pb-2 font-medium w-40">Harga Satuan (Rp/kg)</th>
                                        <th className="text-left pb-2 font-medium w-40">Biaya Pengiriman (Rp/kg)</th>
                                        {!readOnly && <th className="w-8" />}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {p.rates.map(r => (
                                        <tr key={r._uid}>
                                            <td className="py-2 pr-3">
                                                {readOnly ? (
                                                    <div className="flex items-center gap-2">
                                                        <p className="text-white">{r.kecamatan}</p>
                                                        {r.status === 'approved' && (
                                                            <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-1.5 py-0.5 text-[10px] text-emerald-300">Setuju</span>
                                                        )}
                                                        {r.status === 'rejected' && (
                                                            <span className="rounded-full border border-red-400/30 bg-red-400/10 px-1.5 py-0.5 text-[10px] text-red-300">Ditolak</span>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <Sel value={r.kecamatan}
                                                        onChange={e => updateRate(r._uid, 'kecamatan', e.target.value)}>
                                                        {kecamatanList.filter(kk =>
                                                            kk === r.kecamatan || !usedKecamatan.has(kk)
                                                        ).map(kk => (
                                                            <option key={kk} value={kk}>{kk}</option>
                                                        ))}
                                                    </Sel>
                                                )}
                                            </td>
                                            <td className="py-2 pr-3">
                                                {readOnly ? (
                                                    <span className="font-mono text-white">{fRupiah(r.harga_satuan)}</span>
                                                ) : (
                                                    <Inp type="number" min="0" step="1" value={r.harga_satuan}
                                                        onChange={e => updateRate(r._uid, 'harga_satuan', e.target.value)} />
                                                )}
                                            </td>
                                            <td className="py-2 pr-3">
                                                {readOnly ? (
                                                    <span className="font-mono text-white">{fRupiah(r.biaya_pengiriman)}</span>
                                                ) : (
                                                    <Inp type="number" min="0" step="1" value={r.biaya_pengiriman}
                                                        onChange={e => updateRate(r._uid, 'biaya_pengiriman', e.target.value)} />
                                                )}
                                            </td>
                                            {!readOnly && (
                                                <td className="py-2">
                                                    <button type="button" onClick={() => removeRate(r._uid)}
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
    const [pphPersen,    setPphPersen]    = useState('');
    const [formNotes,    setFormNotes]    = useState('');
    const [formProducts, setFormProducts] = useState([]);
    const [products,     setProducts]     = useState([]);
    const [kecamatanList, setKecamatanList] = useState([]);
    const [refLoading,   setRefLoading]   = useState(true);
    const [saving,       setSaving]       = useState(false);
    const [submitting,   setSubmitting]   = useState(false);
    const [error,        setError]        = useState(null);
    const isEdit = Boolean(editId);

    const usedProductIds = new Set(formProducts.map(p => String(p.product_id)));
    const availProducts  = products.filter(p => !usedProductIds.has(String(p.id)));

    useEffect(() => {
        setRefLoading(true);
        const tasks = [
            api.get('/products', { status: 'Aktif', per_page: 100 }),
            api.get('/cost-rates/kecamatan'),
            api.get('/settings/fees-view'),
        ];
        if (editId) tasks.push(api.get(`/cost-rates/${editId}`));

        Promise.all(tasks)
            .then(([prodRes, kecamatanRes, feesRes, detailRes]) => {
                setProducts(Array.isArray(prodRes) ? prodRes : (prodRes.data ?? []));
                setKecamatanList(kecamatanRes ?? []);

                if (detailRes) {
                    setPphPersen(String(detailRes.pph_persen ?? ''));
                    setFormNotes(detailRes.notes ?? '');
                    setFormProducts(groupItemsByProduct(detailRes.items));
                } else {
                    setPphPersen(String(feesRes?.pph_persen ?? ''));
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
            pph_persen: parseFloat(pphPersen),
            notes:      formNotes || null,
            products: formProducts.map(p => ({
                product_id: p.product_id,
                rates: p.rates.map(r => ({
                    kecamatan:        r.kecamatan,
                    harga_satuan:     parseFloat(r.harga_satuan),
                    biaya_pengiriman: parseFloat(r.biaya_pengiriman),
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
                await api.put(`/cost-rates/${editId}`, buildPayload());
            } else {
                await api.post('/cost-rates', buildPayload());
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
            await api.put(`/cost-rates/${editId}`, buildPayload());
            await api.post(`/cost-rates/${editId}/submit`);
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
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-teal-400 border-t-transparent" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <button type="button" onClick={onBack}
                    className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition mb-4">
                    <ArrowLeft size={16} /> Kembali ke Daftar
                </button>
                <h1 className="text-2xl font-semibold text-white">
                    {isEdit ? 'Edit Tarif Biaya' : 'Buat Ajuan Tarif Biaya'}
                </h1>
                <p className="mt-1 text-sm text-slate-500">Region: <span className="text-white">{userRegion}</span></p>
            </div>

            <ErrBanner msg={error} />

            <form onSubmit={handleSave} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <label className="block text-xs font-medium text-slate-400">PPh Region (%)</label>
                        <Inp type="number" min="0" max="100" step="0.01" value={pphPersen}
                            onChange={e => setPphPersen(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                        <label className="block text-xs font-medium text-slate-400">Catatan (opsional)</label>
                        <Inp type="text" value={formNotes} onChange={e => setFormNotes(e.target.value)}
                            placeholder="Keterangan tambahan…" />
                    </div>
                </div>

                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h2 className="text-sm font-semibold text-slate-200">Tarif per Produk</h2>
                        <Sel onChange={addProduct} className="w-56" disabled={!availProducts.length}>
                            <option value="">{availProducts.length ? '+ Tambah Produk…' : 'Semua produk sudah ditambahkan'}</option>
                            {availProducts.map(p => (
                                <option key={p.id} value={p.id}>{p.namaProduk ?? p.nama_produk}</option>
                            ))}
                        </Sel>
                    </div>

                    {formProducts.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-white/10 py-10 text-center">
                            <Wallet size={24} className="mx-auto mb-2 text-slate-600" />
                            <p className="text-sm text-slate-500">Belum ada produk. Pilih produk di atas untuk mulai.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {formProducts.map(p => (
                                <ProductRateRow key={p._uid} p={p} kecamatanList={kecamatanList}
                                    onChange={newP => updateProduct(p._uid, newP)}
                                    onRemove={() => removeProduct(p._uid)}
                                    readOnly={false} />
                            ))}
                        </div>
                    )}
                </div>

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
                            className="flex items-center gap-2 rounded-xl bg-teal-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-400 disabled:opacity-50 transition">
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
        api.get(`/cost-rates/${submissionId}`)
            .then(setDetail)
            .catch(e => setError(e.message))
            .finally(() => setLoading(false));
    }, [submissionId]);

    async function handleSubmit() {
        setSubmitting(true);
        try {
            await api.post(`/cost-rates/${submissionId}/submit`);
            onSubmitted?.();
        } catch (err) {
            setError(err.message || 'Gagal mengajukan.');
        } finally {
            setSubmitting(false);
        }
    }

    if (loading) return (
        <div className="flex items-center justify-center py-24">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-teal-400 border-t-transparent" />
        </div>
    );

    const grouped = groupItemsByProduct(detail?.items);

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
                            Tarif Biaya — {detail?.region}
                        </h1>
                        <div className="mt-1 flex items-center gap-3">
                            <StatusChip value={detail?.status} />
                            <span className="text-sm text-slate-500">
                                PPh {detail?.pph_persen}% · Diajukan oleh {detail?.submitted_by}
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
                                className="flex items-center gap-2 rounded-xl bg-teal-500 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-400 disabled:opacity-50 transition">
                                <Send size={14} />
                                {submitting ? 'Mengajukan…' : 'Ajukan ke SuperAdmin'}
                            </button>
                        </div>
                    )}
                    {userRole === 'AdminRegion' && detail?.status === 'rejected' && (
                        <button onClick={onEdit}
                            className="rounded-xl bg-teal-400/20 border border-teal-400/30 px-4 py-2 text-sm font-semibold text-teal-300 hover:bg-teal-400/30 transition">
                            Revisi & Ajukan Ulang
                        </button>
                    )}
                    {userRole === 'AdminRegion' && (detail?.status === 'approved' || detail?.status === 'partially_approved') && (
                        <button onClick={onEdit}
                            className="rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-300 hover:text-white hover:bg-white/5 transition">
                            Revisi Tarif
                        </button>
                    )}
                </div>
            </div>

            <ErrBanner msg={error} />

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
                            detail.status === 'approved' ? 'border-emerald-400/20 bg-emerald-400/5'
                                : detail.status === 'partially_approved' ? 'border-orange-400/20 bg-orange-400/5'
                                : 'border-red-400/20 bg-red-400/5'
                        }`}>
                            <p className="text-xs text-slate-500 mb-1">
                                Catatan SuperAdmin ({detail.reviewed_by})
                            </p>
                            <p className={`text-sm ${
                                detail.status === 'approved' ? 'text-emerald-300'
                                    : detail.status === 'partially_approved' ? 'text-orange-300'
                                    : 'text-red-300'
                            }`}>
                                {detail.review_note}
                            </p>
                        </div>
                    )}
                </div>
            )}

            <div className="space-y-3">
                <h2 className="text-sm font-semibold text-slate-200">Tarif per Produk ({grouped.length} produk)</h2>
                {grouped.map(p => (
                    <ProductRateRow key={p._uid} p={p} kecamatanList={[]} onChange={() => {}} onRemove={() => {}} readOnly={true} />
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
    const [statusFilter, setStatusFilter] = useState('');
    const [activeFilters, setActiveFilters] = useState({});

    const fetch = useCallback(() => {
        setLoading(true);
        api.get('/cost-rates', { page, ...activeFilters })
            .then(setData)
            .catch(e => setError(e.message))
            .finally(() => setLoading(false));
    }, [page, activeFilters]);

    useEffect(() => { fetch(); }, [fetch]);

    async function handleDelete(id) {
        if (!confirm('Hapus ajuan tarif ini?')) return;
        try {
            await api.del(`/cost-rates/${id}`);
            fetch();
        } catch (err) {
            alert(err.message || 'Gagal menghapus.');
        }
    }

    async function handleSubmitDirect(id) {
        try {
            await api.post(`/cost-rates/${id}/submit`);
            fetch();
        } catch (err) {
            alert(err.message || 'Gagal mengajukan.');
        }
    }

    const columns = [
        ...(isSuperAdmin ? [{ key: 'region', label: 'Region' }] : []),
        { key: 'pph_persen',     label: 'PPh %', render: r => <span className="font-mono text-white">{r.pph_persen}%</span> },
        { key: 'items_count',   label: 'Jumlah Tarif', render: r => <span className="text-xs font-mono">{r.items_count} tarif</span> },
        { key: 'status',         label: 'Status',   render: r => <StatusChip value={r.status} /> },
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
                    {isAdminRegion && ['draft', 'rejected', 'approved', 'partially_approved'].includes(r.status) && (
                        <button onClick={() => onEdit(r.id)}
                            className="rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-slate-300 hover:text-white hover:bg-white/5 transition">
                            {r.status === 'draft' || r.status === 'rejected' ? 'Edit' : 'Revisi'}
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
                    <h1 className="text-2xl font-semibold text-white">Alokasi Biaya</h1>
                    <p className="mt-1 text-sm text-slate-500">
                        {isAdminRegion
                            ? `Tentukan harga satuan, biaya pengiriman per kecamatan, dan PPh region di ${user.region}.`
                            : 'Pantau tarif biaya dari semua region.'}
                    </p>
                </div>
                {isAdminRegion && (
                    <button onClick={onNew}
                        className="flex items-center gap-2 rounded-xl bg-teal-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-400 transition">
                        <Plus size={15} /> Buat Ajuan Baru
                    </button>
                )}
            </div>

            <form onSubmit={e => { e.preventDefault(); setPage(1); setActiveFilters(statusFilter ? { status: statusFilter } : {}); }}
                className="flex flex-wrap gap-3">
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                    className="rounded-xl border border-white/10 bg-slate-950/50 px-3 py-2.5 text-sm text-slate-300 outline-none focus:border-teal-400/30 transition">
                    <option value="">Semua status</option>
                    <option value="draft">Draft</option>
                    <option value="submitted">Diajukan</option>
                    <option value="approved">Disetujui</option>
                    <option value="rejected">Ditolak</option>
                </select>
                <button type="submit"
                    className="rounded-xl border border-white/10 bg-slate-800 px-4 py-2.5 text-sm text-slate-300 hover:text-white transition">
                    Filter
                </button>
                {statusFilter && (
                    <button type="button" onClick={() => { setStatusFilter(''); setActiveFilters({}); setPage(1); }}
                        className="rounded-xl border border-white/10 px-3 py-2.5 text-sm text-slate-500 hover:text-white transition">
                        Reset
                    </button>
                )}
            </form>

            <ErrBanner msg={error} />

            <Table columns={columns} data={data?.data} loading={loading} emptyMessage="Belum ada ajuan tarif biaya." />
            <Pagination meta={data} onPageChange={setPage} />
        </div>
    );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function AlokasiBiaya({ user }) {
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
