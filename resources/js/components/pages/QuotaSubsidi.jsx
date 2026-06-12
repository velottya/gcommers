import { Pencil, Plus, Send, Trash2, X } from 'lucide-react';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../../api/client';
import { Pagination, Table } from '../ui/Table';

// ─── Status chip ──────────────────────────────────────────────────────────────

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function currentPeriod() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function Field({ label, error, children }) {
    return (
        <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-400">{label}</label>
            {children}
            {error && <p className="text-xs text-red-400">{error}</p>}
        </div>
    );
}

function Inp({ error, ...props }) {
    return (
        <input
            className={`w-full rounded-xl border bg-slate-900 px-3 py-2 text-sm text-white outline-none transition
                ${error ? 'border-red-400/60' : 'border-white/10 focus:border-amber-400/40'}`}
            {...props}
        />
    );
}

// ─── Create/Edit Modal ────────────────────────────────────────────────────────

const EMPTY = { region: '', kiosk_email: '', product_code: '', quota_kg: '', period: currentPeriod() };

function QuotaModal({ open, onClose, onSaved, editItem, lockedRegion }) {
    const [form,   setForm]   = useState(EMPTY);
    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState({});
    const firstRef            = useRef(null);

    useEffect(() => {
        if (!open) return;
        setErrors({});
        const base = editItem ? { ...EMPTY, ...editItem, quota_kg: String(editItem.quota_kg) } : EMPTY;
        setForm(lockedRegion ? { ...base, region: lockedRegion } : base);
        setTimeout(() => firstRef.current?.focus(), 50);
    }, [open, editItem, lockedRegion]);

    if (!open) return null;

    const set    = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
    const isEdit = Boolean(editItem);

    async function handleSubmit(e) {
        e.preventDefault();
        setSaving(true);
        setErrors({});
        try {
            if (isEdit) {
                await api.put(`/quota-subsidi/${editItem.id}`, form);
            } else {
                await api.post('/quota-subsidi', form);
            }
            onSaved();
            onClose();
        } catch (err) {
            setErrors(err.status === 422 ? (err.errors || { _: [err.message] }) : { _: [err.message || 'Gagal.'] });
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={onClose} />
            <div className="relative z-10 w-full max-w-lg rounded-2xl border border-white/10 bg-slate-900 shadow-2xl">
                <div className="flex items-center justify-between border-b border-white/8 px-6 py-4">
                    <h2 className="text-base font-semibold text-white">
                        {isEdit ? 'Edit Quota' : 'Tambah Quota Subsidi'}
                    </h2>
                    <button onClick={onClose} className="rounded-lg p-1 text-slate-500 hover:text-white transition"><X size={18} /></button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="max-h-[70vh] overflow-y-auto px-6 py-5 space-y-4">
                        {errors._ && (
                            <div className="rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-300">
                                {errors._.join(' ')}
                            </div>
                        )}
                        <Field label="Region" error={errors.region?.[0]}>
                            <Inp ref={firstRef} type="text" value={form.region} onChange={set('region')}
                                placeholder="Jawa Timur" disabled={Boolean(lockedRegion)} error={errors.region?.[0]} />
                            {lockedRegion && <p className="mt-1 text-xs text-slate-600">Region dikunci sesuai wilayah Anda.</p>}
                        </Field>

                        <Field label="Email Kiosk (kosongkan = semua kiosk di region)" error={errors.kiosk_email?.[0]}>
                            <Inp type="email" value={form.kiosk_email} onChange={set('kiosk_email')}
                                placeholder="kiosk@email.com (opsional)" error={errors.kiosk_email?.[0]} />
                        </Field>

                        <Field label="Kode Produk (kosongkan = semua produk)" error={errors.product_code?.[0]}>
                            <Inp type="text" value={form.product_code} onChange={set('product_code')}
                                placeholder="Kode produk (opsional)" error={errors.product_code?.[0]} />
                        </Field>

                        <div className="grid grid-cols-2 gap-4">
                            <Field label="Quota (kg)" error={errors.quota_kg?.[0]}>
                                <Inp type="number" min="0" step="0.01" value={form.quota_kg} onChange={set('quota_kg')}
                                    placeholder="1000" error={errors.quota_kg?.[0]} />
                            </Field>
                            <Field label="Periode (YYYY-MM)" error={errors.period?.[0]}>
                                <Inp type="month" value={form.period} onChange={set('period')} error={errors.period?.[0]} />
                            </Field>
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 border-t border-white/8 px-6 py-4">
                        <button type="button" onClick={onClose}
                            className="rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-400 hover:text-white transition">
                            Batal
                        </button>
                        <button type="submit" disabled={saving}
                            className="rounded-xl bg-amber-400 px-5 py-2 text-sm font-semibold text-slate-950 hover:bg-amber-300 disabled:opacity-50 transition">
                            {saving ? 'Menyimpan…' : isEdit ? 'Simpan' : 'Tambah'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ─── Delete confirm ───────────────────────────────────────────────────────────

function DeleteConfirm({ item, onClose, onDeleted }) {
    const [deleting, setDeleting] = useState(false);
    const [error,    setError]    = useState(null);

    async function handleDelete() {
        setDeleting(true);
        try {
            await api.del(`/quota-subsidi/${item.id}`);
            onDeleted();
            onClose();
        } catch (err) {
            setError(err.message || 'Gagal menghapus.');
            setDeleting(false);
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={onClose} />
            <div className="relative z-10 w-full max-w-sm rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl">
                <h2 className="text-base font-semibold text-white">Hapus Quota?</h2>
                <p className="mt-2 text-sm text-slate-400">
                    Quota region <span className="font-medium text-white">{item.region}</span> periode{' '}
                    <span className="font-medium text-white">{item.period}</span> akan dihapus.
                </p>
                {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
                <div className="mt-5 flex justify-end gap-3">
                    <button onClick={onClose}
                        className="rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-400 hover:text-white transition">
                        Batal
                    </button>
                    <button onClick={handleDelete} disabled={deleting}
                        className="rounded-xl bg-red-500 px-4 py-2 text-sm font-semibold text-white hover:bg-red-400 disabled:opacity-50 transition">
                        {deleting ? 'Menghapus…' : 'Ya, Hapus'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function QuotaSubsidi({ user }) {
    const isAdminRegion = user?.role === 'AdminRegion';
    const isSuperAdmin  = user?.role === 'SuperAdmin';

    const [data,    setData]    = useState(null);
    const [loading, setLoading] = useState(true);
    const [error,   setError]   = useState(null);
    const [page,    setPage]    = useState(1);
    const [period,  setPeriod]  = useState('');
    const [status,  setStatus]  = useState('');
    const [query,   setQuery]   = useState({});

    const [modalOpen,    setModalOpen]    = useState(false);
    const [editTarget,   setEditTarget]   = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);

    const fetch = useCallback(() => {
        setLoading(true);
        api.get('/quota-subsidi', { page, ...query })
            .then(setData)
            .catch(e => setError(e.message))
            .finally(() => setLoading(false));
    }, [page, query]);

    useEffect(() => { fetch(); }, [fetch]);

    function handleFilter(e) {
        e.preventDefault();
        setPage(1);
        setQuery({
            ...(period ? { period } : {}),
            ...(status ? { status } : {}),
        });
    }

    async function handleSubmit(id) {
        try {
            await api.post(`/quota-subsidi/${id}/submit`);
            fetch();
        } catch (err) {
            alert(err.message || 'Gagal mengajukan.');
        }
    }

    const columns = [
        { key: 'region',       label: 'Region' },
        {
            key: 'kiosk_email', label: 'Kiosk',
            render: r => r.kiosk_email || <span className="text-slate-500 italic text-xs">Semua kiosk</span>,
        },
        {
            key: 'product_code', label: 'Produk',
            render: r => r.product_code || <span className="text-slate-500 italic text-xs">Semua produk</span>,
        },
        {
            key: 'quota_kg', label: 'Quota (kg)',
            render: r => <span className="font-mono">{Number(r.quota_kg).toLocaleString('id-ID')}</span>,
        },
        { key: 'period',   label: 'Periode' },
        { key: 'status',   label: 'Status',   render: r => <StatusChip value={r.status} /> },
        {
            key: 'review_note', label: 'Catatan',
            render: r => r.review_note ? (
                <span className="max-w-[140px] truncate block text-xs text-slate-400" title={r.review_note}>
                    {r.review_note}
                </span>
            ) : null,
        },
        {
            key: '_act', label: '',
            render: r => (
                <div className="flex items-center gap-2 justify-end">
                    {/* AdminRegion: edit & submit draft */}
                    {isAdminRegion && r.status === 'draft' && (
                        <>
                            <button onClick={() => { setEditTarget(r); setModalOpen(true); }} title="Edit"
                                className="rounded-lg p-1.5 text-slate-500 hover:text-amber-400 hover:bg-amber-400/10 transition">
                                <Pencil size={15} />
                            </button>
                            <button onClick={() => setDeleteTarget(r)} title="Hapus"
                                className="rounded-lg p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-400/10 transition">
                                <Trash2 size={15} />
                            </button>
                            <button onClick={() => handleSubmit(r.id)}
                                className="flex items-center gap-1 rounded-lg border border-amber-400/30 bg-amber-400/10 px-2.5 py-1.5 text-xs text-amber-300 hover:bg-amber-400/20 transition">
                                <Send size={12} /> Ajukan
                            </button>
                        </>
                    )}
                    {/* SuperAdmin: handled in Persetujuan page (shown here for context) */}
                    {isSuperAdmin && r.status === 'submitted' && (
                        <span className="text-xs text-amber-300 italic">Menunggu persetujuan di halaman Persetujuan</span>
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
                            ? `Kelola quota pupuk subsidi per kiosk di region ${user.region}.`
                            : 'Pantau quota pupuk subsidi dari semua region.'}
                    </p>
                </div>
                {isAdminRegion && (
                    <button
                        onClick={() => { setEditTarget(null); setModalOpen(true); }}
                        className="flex items-center gap-2 rounded-xl bg-amber-400 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-amber-300 transition"
                    >
                        <Plus size={15} /> Tambah Quota
                    </button>
                )}
            </div>

            <form onSubmit={handleFilter} className="flex flex-wrap gap-3">
                <input type="month" value={period} onChange={e => setPeriod(e.target.value)}
                    className="rounded-xl border border-white/10 bg-slate-950/50 px-3 py-2.5 text-sm text-slate-300 outline-none focus:border-amber-400/30 transition" />
                <select value={status} onChange={e => setStatus(e.target.value)}
                    className="rounded-xl border border-white/10 bg-slate-950/50 px-3 py-2.5 text-sm text-slate-300 outline-none focus:border-amber-400/30 transition">
                    <option value="">Semua status</option>
                    <option value="draft">Draft</option>
                    <option value="submitted">Diajukan</option>
                    <option value="approved">Disetujui</option>
                    <option value="rejected">Ditolak</option>
                </select>
                <button type="submit"
                    className="rounded-xl bg-slate-800 border border-white/10 px-4 py-2.5 text-sm text-slate-300 hover:text-white transition">
                    Filter
                </button>
                {(period || status) && (
                    <button type="button" onClick={() => { setPeriod(''); setStatus(''); setQuery({}); setPage(1); }}
                        className="rounded-xl border border-white/10 px-3 py-2.5 text-sm text-slate-500 hover:text-white transition">
                        Reset
                    </button>
                )}
            </form>

            {error && (
                <div className="rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-300">{error}</div>
            )}

            <Table
                columns={columns}
                data={data?.data}
                loading={loading}
                emptyMessage="Belum ada quota subsidi."
            />
            <Pagination meta={data} onPageChange={setPage} />

            <QuotaModal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                onSaved={fetch}
                editItem={editTarget}
                lockedRegion={isAdminRegion ? user.region : null}
            />
            {deleteTarget && (
                <DeleteConfirm
                    item={deleteTarget}
                    onClose={() => setDeleteTarget(null)}
                    onDeleted={fetch}
                />
            )}
        </div>
    );
}
