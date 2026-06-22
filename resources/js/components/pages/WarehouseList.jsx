import { Pencil, Plus, Trash2, X } from 'lucide-react';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../../api/client';
import { Table } from '../ui/Table';

const VALID_REGIONS = [
    'Jawa Timur',
    'Jawa Tengah Selatan',
    'Jawa Tengah Utara',
    'Makassar',
    'Medan',
    'Lampung',
];

const EMPTY_FORM = { region: '', name: '', address: '', lat: '', lng: '' };

function Field({ label, error, children }) {
    return (
        <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-400">{label}</label>
            {children}
            {error && <p className="text-xs text-red-400">{error}</p>}
        </div>
    );
}

function Input({ error, ...props }) {
    return (
        <input
            className={`w-full rounded-xl border bg-slate-900 px-3 py-2 text-sm text-white outline-none transition
                ${error ? 'border-red-400/60 focus:border-red-400' : 'border-white/10 focus:border-sky-400/40'}`}
            {...props}
        />
    );
}

function WarehouseModal({ open, onClose, onSaved, editTarget }) {
    const [form, setForm]     = useState(EMPTY_FORM);
    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState({});
    const firstRef            = useRef(null);

    useEffect(() => {
        if (!open) return;
        setErrors({});
        setForm(editTarget ? { ...EMPTY_FORM, ...editTarget } : EMPTY_FORM);
        setTimeout(() => firstRef.current?.focus(), 50);
    }, [open, editTarget]);

    if (!open) return null;

    const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));
    const isEdit = Boolean(editTarget);

    async function handleSubmit(e) {
        e.preventDefault();
        setSaving(true);
        setErrors({});
        try {
            if (isEdit) {
                await api.put(`/warehouses/${editTarget.id}`, form);
            } else {
                await api.post('/warehouses', form);
            }
            onSaved();
            onClose();
        } catch (err) {
            setErrors(err.status === 422 ? (err.errors || { _: [err.message] }) : { _: [err.message || 'Terjadi kesalahan.'] });
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={onClose} />
            <div className="relative z-10 w-full max-w-lg rounded-2xl border border-white/10 bg-slate-900 shadow-2xl">
                <div className="flex items-center justify-between border-b border-white/8 px-6 py-4">
                    <h2 className="text-base font-semibold text-white">{isEdit ? 'Edit Gudang' : 'Tambah Gudang'}</h2>
                    <button onClick={onClose} className="rounded-lg p-1 text-slate-500 hover:text-white transition"><X size={18} /></button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="max-h-[70vh] overflow-y-auto px-6 py-5 space-y-4">
                        {errors._ && (
                            <div className="rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-300">{errors._.join(' ')}</div>
                        )}

                        <Field label="Nama Gudang" error={errors.name?.[0]}>
                            <Input ref={firstRef} type="text" value={form.name} onChange={set('name')}
                                placeholder="Gudang Surabaya" error={errors.name?.[0]} />
                        </Field>

                        <Field label="Region" error={errors.region?.[0]}>
                            <select value={form.region} onChange={set('region')}
                                className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-sky-400/40 transition">
                                <option value="">-- Pilih Region --</option>
                                {VALID_REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                            </select>
                        </Field>

                        <Field label="Alamat" error={errors.address?.[0]}>
                            <Input type="text" value={form.address} onChange={set('address')}
                                placeholder="Jl. Margomulyo, Surabaya" error={errors.address?.[0]} />
                        </Field>

                        <div className="grid grid-cols-2 gap-4">
                            <Field label="Latitude" error={errors.lat?.[0]}>
                                <Input type="number" step="0.000001" value={form.lat} onChange={set('lat')} placeholder="-7.2575" />
                            </Field>
                            <Field label="Longitude" error={errors.lng?.[0]}>
                                <Input type="number" step="0.000001" value={form.lng} onChange={set('lng')} placeholder="112.7521" />
                            </Field>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 border-t border-white/8 px-6 py-4">
                        <button type="button" onClick={onClose}
                            className="rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-400 hover:text-white transition">
                            Batal
                        </button>
                        <button type="submit" disabled={saving}
                            className="rounded-xl bg-sky-500 px-5 py-2 text-sm font-semibold text-white hover:bg-sky-400 disabled:opacity-50 transition">
                            {saving ? 'Menyimpan…' : isEdit ? 'Simpan Perubahan' : 'Tambah Gudang'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default function WarehouseList({ user }) {
    const canManage = user?.role === 'SuperAdmin' || user?.role === 'AdminTransport';

    const [data,    setData]    = useState([]);
    const [loading, setLoading] = useState(true);
    const [error,   setError]   = useState(null);
    const [modalOpen,  setModalOpen]  = useState(false);
    const [editTarget, setEditTarget] = useState(null);

    const fetchData = useCallback(() => {
        setLoading(true);
        api.get('/warehouses')
            .then(setData)
            .catch(e => setError(e.message))
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    async function handleDelete(w) {
        if (!confirm(`Hapus gudang "${w.name}"?`)) return;
        try {
            await api.del(`/warehouses/${w.id}`);
            fetchData();
        } catch (err) {
            alert(err.message || 'Gagal menghapus.');
        }
    }

    const columns = [
        { key: 'name',    label: 'Nama Gudang' },
        { key: 'region',  label: 'Region' },
        { key: 'address', label: 'Alamat', render: r => r.address || '—' },
        { key: 'coord',   label: 'Koordinat', render: r => (r.lat && r.lng) ? `${r.lat}, ${r.lng}` : '—' },
        ...(canManage ? [{
            key: '_actions', label: '',
            render: (r) => (
                <div className="flex items-center gap-2 justify-end">
                    <button onClick={() => { setEditTarget(r); setModalOpen(true); }}
                        className="rounded-lg p-1.5 text-slate-500 hover:text-sky-400 hover:bg-sky-400/10 transition" title="Edit">
                        <Pencil size={15} />
                    </button>
                    <button onClick={() => handleDelete(r)}
                        className="rounded-lg p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-400/10 transition" title="Hapus">
                        <Trash2 size={15} />
                    </button>
                </div>
            ),
        }] : []),
    ];

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-semibold text-white">Daftar Gudang</h1>
                    <p className="mt-1 text-sm text-slate-500">Gudang asal pengiriman yang dipilih saat alokasi sopir.</p>
                </div>
                {canManage && (
                    <button onClick={() => { setEditTarget(null); setModalOpen(true); }}
                        className="flex items-center gap-2 rounded-xl bg-sky-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-400 transition">
                        <Plus size={16} />
                        Tambah Gudang
                    </button>
                )}
            </div>

            {error && (
                <div className="rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-300">{error}</div>
            )}

            <Table columns={columns} data={data} loading={loading} emptyMessage="Belum ada gudang terdaftar." />

            <WarehouseModal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                onSaved={fetchData}
                editTarget={editTarget}
            />
        </div>
    );
}
