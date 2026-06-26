import { ArrowLeft, MapPin, Plus, Send, Trash2 } from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';
import { api } from '../../api/client';
import { Pagination, Table } from '../ui/Table';

function formatRupiah(val) {
    if (val == null) return '—';
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);
}

// ─── Tab 1: Menentukan Tarif Transportir (tidak berubah) ──────────────────────

function TarifPartnerTab({ user }) {
    const [data,    setData]    = useState([]);
    const [loading, setLoading] = useState(true);
    const [error,   setError]   = useState(null);
    const [editing, setEditing] = useState(null);
    const [value,   setValue]   = useState('');
    const [saving,  setSaving]  = useState(false);

    const fetch = () => {
        setLoading(true);
        api.get('/transport-partner-rates')
            .then(setData)
            .catch(e => setError(e.message))
            .finally(() => setLoading(false));
    };

    useEffect(() => { fetch(); }, []);

    function startEdit(row) {
        setEditing(row.company_name);
        setValue(row.shipping_cost_per_kg != null ? String(row.shipping_cost_per_kg) : '');
        setError(null);
    }

    async function handleSave(companyName) {
        setSaving(true);
        setError(null);
        try {
            await api.post('/transport-partner-rates', {
                company_name: companyName,
                shipping_cost_per_kg: parseFloat(value),
            });
            setEditing(null);
            fetch();
        } catch (err) {
            setError(err.message || 'Gagal menyimpan.');
        } finally {
            setSaving(false);
        }
    }

    const columns = [
        { key: 'company_name', label: 'Nama Mitra', render: r => <span className="font-medium text-white">{r.company_name}</span> },
        {
            key: 'shipping_cost_per_kg', label: 'Tarif Saat Ini (Rp/kg)',
            render: r => editing === r.company_name ? (
                <div className="flex items-center gap-2">
                    <input type="number" min="0" step="1" value={value} onChange={e => setValue(e.target.value)} autoFocus
                        className="w-32 rounded-lg border border-white/10 bg-slate-900 px-2 py-1 text-sm text-white outline-none focus:border-teal-400/40 transition" />
                    <button onClick={() => handleSave(r.company_name)} disabled={saving}
                        className="rounded-lg bg-teal-500 px-3 py-1 text-xs font-semibold text-white hover:bg-teal-400 disabled:opacity-50 transition">
                        {saving ? 'Menyimpan…' : 'Simpan'}
                    </button>
                    <button onClick={() => setEditing(null)} className="text-xs text-slate-500 hover:text-white transition">
                        Batal
                    </button>
                </div>
            ) : (
                r.shipping_cost_per_kg != null
                    ? <span className="font-mono text-white">{formatRupiah(r.shipping_cost_per_kg)}/kg</span>
                    : <span className="text-xs text-slate-600 italic">Belum diatur</span>
            ),
        },
        {
            key: '_act', label: '',
            render: r => editing === r.company_name ? null : (
                <button onClick={() => startEdit(r)}
                    className="rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-slate-300 hover:text-white hover:bg-white/5 transition">
                    {r.shipping_cost_per_kg != null ? 'Ubah' : 'Atur'}
                </button>
            ),
        },
    ];

    return (
        <div className="space-y-6">
            <div>
                <p className="text-sm text-slate-500">
                    Atur biaya pengiriman (Rp/kg) untuk tiap mitra transportir di region {user?.region}. Tarif ini otomatis
                    dipakai saat mengatur alokasi biaya pengiriman per kecamatan.
                </p>
            </div>

            {error && (
                <div className="rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-300">{error}</div>
            )}

            <Table columns={columns} data={data} loading={loading} emptyMessage="Belum ada mitra transportir terdaftar." />
        </div>
    );
}

// ─── Tab 2: Alokasi Biaya Pengiriman per Kecamatan ────────────────────────────

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

let _uid = 0;
const nextUid = () => ++_uid;

function emptyItem() {
    return { _uid: nextUid(), kecamatan: '', transport_partner: '' };
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

function AllocationTable({ items, kecamatanList, partners, onUpdate, onRemove, readOnly }) {
    if (items.length === 0) {
        return <p className="text-xs text-slate-600 italic py-2">Belum ada alokasi.</p>;
    }

    function rateFor(companyName) {
        return partners.find(p => p.company_name === companyName)?.shipping_cost_per_kg;
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm">
                <thead>
                    <tr className="text-xs text-slate-500 border-b border-white/8">
                        <th className="text-left pb-2 font-medium">Kecamatan</th>
                        <th className="text-left pb-2 font-medium w-56">Mitra Transportir</th>
                        <th className="text-left pb-2 font-medium w-36">Ongkir (Rp/kg)</th>
                        {!readOnly && <th className="w-8" />}
                    </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                    {items.map(it => (
                        <tr key={it._uid}>
                            <td className="py-2 pr-3">
                                {readOnly ? (
                                    <div className="flex items-center gap-2">
                                        <p className="text-white">{it.kecamatan}</p>
                                        {it.status === 'approved' && (
                                            <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-1.5 py-0.5 text-[10px] text-emerald-300">Setuju</span>
                                        )}
                                        {it.status === 'rejected' && (
                                            <span className="rounded-full border border-red-400/30 bg-red-400/10 px-1.5 py-0.5 text-[10px] text-red-300">Ditolak</span>
                                        )}
                                    </div>
                                ) : (
                                    <Sel value={it.kecamatan} onChange={e => onUpdate(it._uid, 'kecamatan', e.target.value)}>
                                        <option value="">-- Pilih Kecamatan --</option>
                                        {kecamatanList.map(kk => (
                                            <option key={kk} value={kk}>{kk}</option>
                                        ))}
                                    </Sel>
                                )}
                            </td>
                            <td className="py-2 pr-3">
                                {readOnly ? (
                                    <p className="text-white">{it.transport_partner}</p>
                                ) : (
                                    <Sel value={it.transport_partner} onChange={e => onUpdate(it._uid, 'transport_partner', e.target.value)}>
                                        <option value="">-- Pilih Mitra --</option>
                                        {partners.map(p => (
                                            <option key={p.company_name} value={p.company_name} disabled={p.shipping_cost_per_kg == null}>
                                                {p.company_name}{p.shipping_cost_per_kg == null ? ' (belum ada tarif)' : ''}
                                            </option>
                                        ))}
                                    </Sel>
                                )}
                            </td>
                            <td className="py-2 pr-3">
                                <span className="font-mono text-white">
                                    {readOnly
                                        ? formatRupiah(it.biaya_pengiriman)
                                        : (it.transport_partner ? formatRupiah(rateFor(it.transport_partner)) : '—')}
                                </span>
                            </td>
                            {!readOnly && (
                                <td className="py-2">
                                    <button type="button" onClick={() => onRemove(it._uid)}
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
    );
}

function AlokasiFormView({ editId, userRegion, onBack, onSaved }) {
    const [formNotes,     setFormNotes]     = useState('');
    const [formItems,     setFormItems]     = useState([]);
    const [partners,      setPartners]      = useState([]);
    const [kecamatanList, setKecamatanList] = useState([]);
    const [refLoading,    setRefLoading]    = useState(true);
    const [saving,        setSaving]        = useState(false);
    const [submitting,    setSubmitting]    = useState(false);
    const [error,         setError]         = useState(null);
    const isEdit = Boolean(editId);

    useEffect(() => {
        setRefLoading(true);
        const tasks = [
            api.get('/transport-partner-rates'),
            api.get('/shipping-allocations/kecamatan'),
        ];
        if (editId) tasks.push(api.get(`/shipping-allocations/${editId}`));

        Promise.all(tasks)
            .then(([partnerRes, kecamatanRes, detailRes]) => {
                setPartners(partnerRes ?? []);
                setKecamatanList(kecamatanRes ?? []);

                if (detailRes) {
                    setFormNotes(detailRes.notes ?? '');
                    setFormItems((detailRes.items ?? []).map(it => ({
                        _uid:              nextUid(),
                        kecamatan:         it.kecamatan,
                        transport_partner: it.transport_partner,
                        status:            it.status,
                    })));
                }
            })
            .catch(e => setError(e.message || 'Gagal memuat data.'))
            .finally(() => setRefLoading(false));
    }, [editId]);

    function addItem() {
        setFormItems(rs => [...rs, emptyItem()]);
    }

    function updateItem(uid, field, value) {
        setFormItems(rs => rs.map(r => r._uid === uid ? { ...r, [field]: value } : r));
    }

    function removeItem(uid) {
        setFormItems(rs => rs.filter(r => r._uid !== uid));
    }

    function buildPayload() {
        return {
            notes: formNotes || null,
            items: formItems.map(it => ({
                kecamatan:         it.kecamatan,
                transport_partner: it.transport_partner,
            })),
        };
    }

    async function handleSave(e) {
        e.preventDefault();
        setSaving(true);
        setError(null);
        try {
            if (isEdit) {
                await api.put(`/shipping-allocations/${editId}`, buildPayload());
            } else {
                await api.post('/shipping-allocations', buildPayload());
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
            await api.put(`/shipping-allocations/${editId}`, buildPayload());
            await api.post(`/shipping-allocations/${editId}/submit`);
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
                <h1 className="text-xl font-semibold text-white">
                    {isEdit ? 'Edit Alokasi Biaya Pengiriman' : 'Buat Ajuan Alokasi Biaya Pengiriman'}
                </h1>
                <p className="mt-1 text-sm text-slate-500">Region: <span className="text-white">{userRegion}</span></p>
            </div>

            <ErrBanner msg={error} />

            <form onSubmit={handleSave} className="space-y-6">
                <div className="space-y-1">
                    <label className="block text-xs font-medium text-slate-400">Catatan (opsional)</label>
                    <input type="text" value={formNotes} onChange={e => setFormNotes(e.target.value)}
                        placeholder="Keterangan tambahan…"
                        className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-teal-400/40 transition" />
                </div>

                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h2 className="text-sm font-semibold text-slate-200">Mitra Transportir per Kecamatan</h2>
                        <button type="button" onClick={addItem}
                            className="flex items-center gap-1 rounded-lg border border-teal-400/30 bg-teal-400/10 px-2.5 py-1.5 text-xs text-teal-300 hover:bg-teal-400/20 transition">
                            <Plus size={11} /> Tambah Baris
                        </button>
                    </div>

                    {formItems.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-white/10 py-10 text-center">
                            <MapPin size={24} className="mx-auto mb-2 text-slate-600" />
                            <p className="text-sm text-slate-500">Belum ada alokasi. Tambah baris untuk mulai.</p>
                        </div>
                    ) : (
                        <div className="rounded-2xl border border-white/10 bg-slate-900/60 px-4 pb-4 pt-3">
                            <AllocationTable items={formItems} kecamatanList={kecamatanList} partners={partners}
                                onUpdate={updateItem} onRemove={removeItem} readOnly={false} />
                        </div>
                    )}
                    <p className="text-xs text-slate-600">1 kecamatan hanya boleh dialokasikan ke 1 mitra transportir.</p>
                </div>

                <div className="flex justify-end gap-3 border-t border-white/8 pt-5">
                    <button type="button" onClick={onBack}
                        className="rounded-xl border border-white/10 px-5 py-2.5 text-sm text-slate-400 hover:text-white transition">
                        Batal
                    </button>
                    <button type="submit" disabled={saving || submitting || formItems.length === 0}
                        className="rounded-xl border border-slate-600 bg-slate-800 px-5 py-2.5 text-sm text-slate-200 hover:bg-slate-700 disabled:opacity-50 transition">
                        {saving ? 'Menyimpan…' : 'Simpan Draft'}
                    </button>
                    {isEdit && (
                        <button type="button" onClick={handleSubmit}
                            disabled={saving || submitting || formItems.length === 0}
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

function AlokasiDetailView({ submissionId, userRole, onBack, onEdit, onSubmitted }) {
    const [detail,     setDetail]     = useState(null);
    const [loading,    setLoading]    = useState(true);
    const [error,      setError]      = useState(null);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        setLoading(true);
        api.get(`/shipping-allocations/${submissionId}`)
            .then(setDetail)
            .catch(e => setError(e.message))
            .finally(() => setLoading(false));
    }, [submissionId]);

    async function handleSubmit() {
        setSubmitting(true);
        try {
            await api.post(`/shipping-allocations/${submissionId}/submit`);
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

    return (
        <div className="space-y-6">
            <div>
                <button type="button" onClick={onBack}
                    className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition mb-4">
                    <ArrowLeft size={16} /> Kembali ke Daftar
                </button>
                <div className="flex items-start justify-between">
                    <div>
                        <h1 className="text-xl font-semibold text-white">
                            Alokasi Biaya Pengiriman — {detail?.region}
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
                            Revisi Alokasi
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
                <h2 className="text-sm font-semibold text-slate-200">Mitra Transportir per Kecamatan ({(detail?.items ?? []).length} baris)</h2>
                <div className="rounded-2xl border border-white/10 bg-slate-900/60 px-4 pb-4 pt-3">
                    <AllocationTable items={detail?.items ?? []} kecamatanList={[]} partners={[]}
                        onUpdate={() => {}} onRemove={() => {}} readOnly={true} />
                </div>
            </div>
        </div>
    );
}

function AlokasiListView({ user, onNew, onEdit, onView }) {
    const isAdminRegion = user?.role === 'AdminRegion';
    const isSuperAdmin  = user?.role === 'SuperAdmin';

    const [data,          setData]          = useState(null);
    const [loading,       setLoading]       = useState(true);
    const [error,         setError]         = useState(null);
    const [page,          setPage]          = useState(1);
    const [statusFilter,  setStatusFilter]  = useState('');
    const [activeFilters, setActiveFilters] = useState({});

    const fetch = useCallback(() => {
        setLoading(true);
        api.get('/shipping-allocations', { page, ...activeFilters })
            .then(setData)
            .catch(e => setError(e.message))
            .finally(() => setLoading(false));
    }, [page, activeFilters]);

    useEffect(() => { fetch(); }, [fetch]);

    async function handleDelete(id) {
        if (!confirm('Hapus ajuan alokasi ini?')) return;
        try {
            await api.del(`/shipping-allocations/${id}`);
            fetch();
        } catch (err) {
            alert(err.message || 'Gagal menghapus.');
        }
    }

    async function handleSubmitDirect(id) {
        try {
            await api.post(`/shipping-allocations/${id}/submit`);
            fetch();
        } catch (err) {
            alert(err.message || 'Gagal mengajukan.');
        }
    }

    const columns = [
        ...(isSuperAdmin ? [{ key: 'region', label: 'Region' }] : []),
        { key: 'items_count',   label: 'Jumlah Kecamatan', render: r => <span className="text-xs font-mono">{r.items_count} baris</span> },
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
                <p className="text-sm text-slate-500 max-w-2xl">
                    {isAdminRegion
                        ? `Tentukan mitra transportir untuk tiap kecamatan di ${user.region}. Ongkir otomatis mengikuti tarif mitra di tab Menentukan Tarif Transportir.`
                        : 'Pantau ajuan alokasi biaya pengiriman dari semua region.'}
                </p>
                {isAdminRegion && (
                    <button onClick={onNew}
                        className="flex items-center gap-2 rounded-xl bg-teal-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-400 transition shrink-0">
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

            <Table columns={columns} data={data?.data} loading={loading} emptyMessage="Belum ada ajuan alokasi biaya pengiriman." />
            <Pagination meta={data} onPageChange={setPage} />
        </div>
    );
}

function AlokasiPengirimanTab({ user }) {
    const [view,   setView]   = useState('list'); // 'list' | 'form' | 'detail'
    const [editId, setEditId] = useState(null);
    const [viewId, setViewId] = useState(null);

    function handleNew()       { setEditId(null); setView('form'); }
    function handleEdit(id)    { setEditId(id);   setView('form'); }
    function handleView(id)    { setViewId(id);   setView('detail'); }
    function handleBack()      { setView('list'); setEditId(null); setViewId(null); }
    function handleSaved()     { setView('list'); setEditId(null); }
    function handleSubmitted() { setView('list'); setViewId(null); }

    if (view === 'form') {
        return (
            <AlokasiFormView
                editId={editId}
                userRegion={user?.region}
                onBack={handleBack}
                onSaved={handleSaved}
            />
        );
    }

    if (view === 'detail') {
        return (
            <AlokasiDetailView
                submissionId={viewId}
                userRole={user?.role}
                onBack={handleBack}
                onEdit={() => handleEdit(viewId)}
                onSubmitted={handleSubmitted}
            />
        );
    }

    return (
        <AlokasiListView
            user={user}
            onNew={handleNew}
            onEdit={handleEdit}
            onView={handleView}
        />
    );
}

// ─── Main component ───────────────────────────────────────────────────────────

const TABS = [
    { key: 'tarif',   label: 'Menentukan Tarif Transportir' },
    { key: 'alokasi', label: 'Alokasi Biaya Pengiriman per Kecamatan' },
];

export default function TarifTransportir({ user }) {
    const [tab, setTab] = useState('tarif');

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-semibold text-white">Tarif Transportir</h1>
                <p className="mt-1 text-sm text-slate-500">Kelola tarif mitra transportir dan alokasi biaya pengiriman tiap kecamatan.</p>
            </div>

            <div className="flex gap-2 border-b border-white/8">
                {TABS.map(t => (
                    <button key={t.key} onClick={() => setTab(t.key)}
                        className={`px-4 py-2.5 text-sm font-medium border-b-2 transition -mb-px
                            ${tab === t.key ? 'border-teal-400 text-white' : 'border-transparent text-slate-500 hover:text-slate-300'}`}>
                        {t.label}
                    </button>
                ))}
            </div>

            {tab === 'tarif' && <TarifPartnerTab user={user} />}
            {tab === 'alokasi' && <AlokasiPengirimanTab user={user} />}
        </div>
    );
}
