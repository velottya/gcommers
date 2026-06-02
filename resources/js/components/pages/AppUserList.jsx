import { Pencil, Plus, Search, Store, Trash2, Truck, X } from 'lucide-react';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../../api/client';
import { Pagination, Table } from '../ui/Table';

// ─── helpers ─────────────────────────────────────────────────────────────────

function formatDate(val) {
    if (!val) return '—';
    return new Date(val).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ─── reusable field components ────────────────────────────────────────────────

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

// ─── Kiosk modal ─────────────────────────────────────────────────────────────

const KIOSK_EMPTY = {
    Email: '', DisplayName: '', password: '', Phone: '', Address: '', KioskName: '', Region: '', PicName: '',
};

function KioskModal({ open, onClose, onSaved, editUser, lockedRegion }) {
    const [form, setForm]     = useState(KIOSK_EMPTY);
    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState({});
    const firstRef            = useRef(null);

    useEffect(() => {
        if (!open) return;
        setErrors({});
        const base = editUser ? { ...KIOSK_EMPTY, ...editUser, Email: editUser.Email } : KIOSK_EMPTY;
        setForm(lockedRegion ? { ...base, Region: lockedRegion } : base);
        setTimeout(() => firstRef.current?.focus(), 50);
    }, [open, editUser, lockedRegion]);

    if (!open) return null;

    const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));
    const isEdit = Boolean(editUser);

    async function handleSubmit(e) {
        e.preventDefault();
        setSaving(true);
        setErrors({});
        try {
            if (isEdit) {
                await api.put(`/app-users/${editUser.Id}`, form);
            } else {
                await api.post('/app-users/kiosk', form);
            }
            onSaved();
            onClose();
        } catch (err) {
            setErrors(err.status === 422 ? (err.errors || { _: [err.message] }) : { _: [err.message || 'Gagal menyimpan.'] });
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={onClose} />
            <div className="relative z-10 w-full max-w-lg rounded-2xl border border-white/10 bg-slate-900 shadow-2xl">
                <div className="flex items-center justify-between border-b border-white/8 px-6 py-4">
                    <h2 className="flex items-center gap-2 text-base font-semibold text-white">
                        <Store size={16} className="text-amber-400" />
                        {isEdit ? 'Edit Kiosk' : 'Tambah Kiosk'}
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
                        <Field label="Email" error={errors.Email?.[0]}>
                            <Inp ref={firstRef} type="email" value={form.Email} onChange={set('Email')}
                                disabled={isEdit} placeholder="kiosk@email.com" error={errors.Email?.[0]} />
                            {isEdit && <p className="mt-1 text-xs text-slate-600">Email tidak bisa diubah.</p>}
                        </Field>
                        <Field label="Nama Lengkap" error={errors.DisplayName?.[0]}>
                            <Inp type="text" value={form.DisplayName} onChange={set('DisplayName')}
                                placeholder="Nama pemilik kiosk" error={errors.DisplayName?.[0]} />
                        </Field>
                        <div className="grid grid-cols-2 gap-4">
                            <Field label="Nama Kiosk" error={errors.KioskName?.[0]}>
                                <Inp type="text" value={form.KioskName} onChange={set('KioskName')}
                                    placeholder="Kiosk Makmur" error={errors.KioskName?.[0]} />
                            </Field>
                            <Field label="Region" error={errors.Region?.[0]}>
                                <Inp type="text" value={form.Region} onChange={set('Region')}
                                    placeholder="Jawa Timur" error={errors.Region?.[0]}
                                    disabled={Boolean(lockedRegion)} />
                                {lockedRegion && (
                                    <p className="mt-1 text-xs text-slate-600">Region dikunci sesuai wilayah Anda.</p>
                                )}
                            </Field>
                        </div>
                        <Field label="No. Telepon" error={errors.Phone?.[0]}>
                            <Inp type="text" value={form.Phone} onChange={set('Phone')}
                                placeholder="08xx" error={errors.Phone?.[0]} />
                        </Field>
                        <Field label="Alamat" error={errors.Address?.[0]}>
                            <textarea
                                value={form.Address}
                                onChange={set('Address')}
                                placeholder="Jl. Contoh No. 1"
                                rows={2}
                                className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white outline-none resize-none focus:border-amber-400/40 transition"
                            />
                        </Field>
                        <Field
                            label={isEdit ? 'Password Baru (kosongkan jika tidak diubah)' : 'Password'}
                            error={errors.password?.[0]}
                        >
                            <Inp
                                type="password"
                                value={form.password}
                                onChange={set('password')}
                                placeholder={isEdit ? '••••••••' : 'Min. 8 karakter'}
                                error={errors.password?.[0]}
                            />
                        </Field>
                    </div>
                    <div className="flex justify-end gap-3 border-t border-white/8 px-6 py-4">
                        <button type="button" onClick={onClose}
                            className="rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-400 hover:text-white transition">
                            Batal
                        </button>
                        <button type="submit" disabled={saving}
                            className="rounded-xl bg-amber-400 px-5 py-2 text-sm font-semibold text-slate-950 hover:bg-amber-300 disabled:opacity-50 transition">
                            {saving ? 'Menyimpan…' : isEdit ? 'Simpan' : 'Buat Kiosk'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ─── Transportir modal ────────────────────────────────────────────────────────

const TRANS_EMPTY = {
    Email: '', TransportirName: '', CompanyName: '', Phone: '',
    PoliceNumber: '', Type: 'Truk', password: '',
};

function TransportirModal({ open, onClose, onSaved, editUser, lockedCompany }) {
    const [form, setForm]     = useState(TRANS_EMPTY);
    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState({});
    const firstRef            = useRef(null);

    useEffect(() => {
        if (!open) return;
        setErrors({});
        const base = editUser ? { ...TRANS_EMPTY, ...editUser, password: '' } : TRANS_EMPTY;
        setForm(lockedCompany ? { ...base, CompanyName: lockedCompany } : base);
        setTimeout(() => firstRef.current?.focus(), 50);
    }, [open, editUser, lockedCompany]);

    if (!open) return null;

    const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));
    const isEdit = Boolean(editUser);

    async function handleSubmit(e) {
        e.preventDefault();
        setSaving(true);
        setErrors({});
        try {
            if (isEdit) {
                await api.put(`/app-users/${editUser.Id}`, form);
            } else {
                await api.post('/app-users/transportir', form);
            }
            onSaved();
            onClose();
        } catch (err) {
            setErrors(err.status === 422 ? (err.errors || { _: [err.message] }) : { _: [err.message || 'Gagal menyimpan.'] });
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={onClose} />
            <div className="relative z-10 w-full max-w-lg rounded-2xl border border-white/10 bg-slate-900 shadow-2xl">
                <div className="flex items-center justify-between border-b border-white/8 px-6 py-4">
                    <h2 className="flex items-center gap-2 text-base font-semibold text-white">
                        <Truck size={16} className="text-sky-400" />
                        {isEdit ? 'Edit Transportir' : 'Tambah Transportir'}
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

                        <Field label="Email" error={errors.Email?.[0]}>
                            <Inp ref={firstRef} type="email" value={form.Email} onChange={set('Email')}
                                disabled={isEdit} placeholder="driver@email.com" error={errors.Email?.[0]} />
                            {isEdit && <p className="mt-1 text-xs text-slate-600">Email tidak bisa diubah.</p>}
                        </Field>

                        <Field label="Nama Transportir" error={errors.TransportirName?.[0]}>
                            <Inp type="text" value={form.TransportirName} onChange={set('TransportirName')}
                                placeholder="Budi Santoso" error={errors.TransportirName?.[0]} />
                        </Field>

                        <Field label="Nama Perusahaan" error={errors.CompanyName?.[0]}>
                            <Inp type="text" value={form.CompanyName} onChange={set('CompanyName')}
                                placeholder="PT. Angkut Jaya" error={errors.CompanyName?.[0]}
                                disabled={Boolean(lockedCompany)} />
                            {lockedCompany && (
                                <p className="mt-1 text-xs text-slate-600">Perusahaan dikunci sesuai perusahaan Anda.</p>
                            )}
                        </Field>

                        <div className="grid grid-cols-2 gap-4">
                            <Field label="No. HP" error={errors.Phone?.[0]}>
                                <Inp type="text" value={form.Phone} onChange={set('Phone')}
                                    placeholder="08xx" error={errors.Phone?.[0]} />
                            </Field>
                            <Field label="No. Polisi" error={errors.PoliceNumber?.[0]}>
                                <Inp type="text" value={form.PoliceNumber} onChange={set('PoliceNumber')}
                                    placeholder="B 1234 XX" error={errors.PoliceNumber?.[0]} />
                            </Field>
                        </div>

                        <Field label="Jenis Kendaraan" error={errors.Type?.[0]}>
                            <Inp type="text" value={form.Type} onChange={set('Type')}
                                placeholder="Truk / Pick Up / Motor" error={errors.Type?.[0]} />
                        </Field>

                        <Field
                            label={isEdit ? 'Password Baru (kosongkan jika tidak diubah)' : 'Password'}
                            error={errors.password?.[0]}
                        >
                            <Inp type="password" value={form.password} onChange={set('password')}
                                placeholder={isEdit ? '••••••••' : 'Min. 8 karakter'}
                                error={errors.password?.[0]} />
                        </Field>
                    </div>
                    <div className="flex justify-end gap-3 border-t border-white/8 px-6 py-4">
                        <button type="button" onClick={onClose}
                            className="rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-400 hover:text-white transition">
                            Batal
                        </button>
                        <button type="submit" disabled={saving}
                            className="rounded-xl bg-sky-500 px-5 py-2 text-sm font-semibold text-white hover:bg-sky-400 disabled:opacity-50 transition">
                            {saving ? 'Menyimpan…' : isEdit ? 'Simpan' : 'Buat Transportir'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ─── Delete confirm ───────────────────────────────────────────────────────────

function DeleteConfirm({ user, onClose, onDeleted }) {
    const [deleting, setDeleting] = useState(false);
    const [error, setError]       = useState(null);

    async function handleDelete() {
        setDeleting(true);
        setError(null);
        try {
            await api.del(`/app-users/${user.Id}`);
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
                <h2 className="text-base font-semibold text-white">Hapus Pengguna?</h2>
                <p className="mt-2 text-sm text-slate-400">
                    Akun <span className="font-medium text-white">{user.DisplayName}</span> ({user.Email}) akan dihapus permanen.
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

// ─── Kiosk tab ────────────────────────────────────────────────────────────────

const KIOSK_COLS = (onEdit, onDelete) => [
    { key: 'Email',       label: 'Email' },
    { key: 'DisplayName', label: 'Nama' },
    { key: 'KioskName',   label: 'Nama Kiosk' },
    { key: 'Region',      label: 'Region' },
    { key: 'Phone',       label: 'Telepon' },
    { key: 'CreatedAt',   label: 'Bergabung', render: r => formatDate(r.CreatedAt) },
    {
        key: '_act', label: '',
        render: r => (
            <div className="flex items-center gap-2 justify-end">
                <button onClick={() => onEdit(r)} title="Edit"
                    className="rounded-lg p-1.5 text-slate-500 hover:text-amber-400 hover:bg-amber-400/10 transition">
                    <Pencil size={15} />
                </button>
                <button onClick={() => onDelete(r)} title="Hapus"
                    className="rounded-lg p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-400/10 transition">
                    <Trash2 size={15} />
                </button>
            </div>
        ),
    },
];

function KioskTab({ lockedRegion }) {
    const [data,    setData]    = useState(null);
    const [loading, setLoading] = useState(true);
    const [error,   setError]   = useState(null);
    const [page,    setPage]    = useState(1);
    const [search,  setSearch]  = useState('');
    const [query,   setQuery]   = useState('');

    const [modalOpen,    setModalOpen]    = useState(false);
    const [editTarget,   setEditTarget]   = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);

    const fetch = useCallback(() => {
        setLoading(true);
        api.get('/app-users/kiosk', { page, search: query })
            .then(setData)
            .catch(e => setError(e.message))
            .finally(() => setLoading(false));
    }, [page, query]);

    useEffect(() => { fetch(); }, [fetch]);

    function handleSearch(e) {
        e.preventDefault();
        setPage(1);
        setQuery(search);
    }

    return (
        <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-3">
                <form onSubmit={handleSearch} className="flex flex-1 gap-3">
                    <div className="relative flex-1 min-w-[200px]">
                        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                        <input type="text" placeholder="Cari email, nama, kiosk…"
                            value={search} onChange={e => setSearch(e.target.value)}
                            className="w-full rounded-xl border border-white/10 bg-slate-950/50 pl-9 pr-4 py-2 text-sm text-white placeholder-slate-600 outline-none focus:border-amber-400/30 transition" />
                    </div>
                    <button type="submit"
                        className="rounded-xl bg-slate-800 px-4 py-2 text-sm text-slate-300 hover:text-white border border-white/10 transition">
                        Cari
                    </button>
                </form>
                <button onClick={() => { setEditTarget(null); setModalOpen(true); }}
                    className="flex items-center gap-2 rounded-xl bg-amber-400 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-amber-300 transition">
                    <Plus size={15} /> Tambah Kiosk
                </button>
            </div>

            {error && (
                <div className="rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-300">{error}</div>
            )}

            <Table
                columns={KIOSK_COLS(
                    (r) => { setEditTarget(r); setModalOpen(true); },
                    (r) => setDeleteTarget(r)
                )}
                data={data?.data}
                loading={loading}
                emptyMessage="Belum ada pengguna kiosk."
            />
            <Pagination meta={data} onPageChange={setPage} />

            <KioskModal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                onSaved={fetch}
                editUser={editTarget}
                lockedRegion={lockedRegion}
            />
            {deleteTarget && (
                <DeleteConfirm
                    user={deleteTarget}
                    onClose={() => setDeleteTarget(null)}
                    onDeleted={fetch}
                />
            )}
        </div>
    );
}

// ─── Transportir tab ──────────────────────────────────────────────────────────

const TRANS_COLS = (onEdit, onDelete) => [
    { key: 'Email',           label: 'Email' },
    { key: 'DisplayName',     label: 'Nama' },
    { key: 'TransportirName', label: 'Driver' },
    { key: 'CompanyName',     label: 'Perusahaan' },
    { key: 'PoliceNumber',    label: 'No. Polisi' },
    { key: 'Phone',           label: 'Telepon' },
    { key: 'CreatedAt',       label: 'Bergabung', render: r => formatDate(r.CreatedAt) },
    {
        key: '_act', label: '',
        render: r => (
            <div className="flex items-center gap-2 justify-end">
                <button onClick={() => onEdit(r)} title="Edit"
                    className="rounded-lg p-1.5 text-slate-500 hover:text-amber-400 hover:bg-amber-400/10 transition">
                    <Pencil size={15} />
                </button>
                <button onClick={() => onDelete(r)} title="Hapus"
                    className="rounded-lg p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-400/10 transition">
                    <Trash2 size={15} />
                </button>
            </div>
        ),
    },
];

function TransportirTab({ lockedCompany }) {
    const [data,    setData]    = useState(null);
    const [loading, setLoading] = useState(true);
    const [error,   setError]   = useState(null);
    const [page,    setPage]    = useState(1);
    const [search,  setSearch]  = useState('');
    const [query,   setQuery]   = useState('');

    const [modalOpen,    setModalOpen]    = useState(false);
    const [editTarget,   setEditTarget]   = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);

    const fetch = useCallback(() => {
        setLoading(true);
        api.get('/app-users/transportir', { page, search: query })
            .then(setData)
            .catch(e => setError(e.message))
            .finally(() => setLoading(false));
    }, [page, query]);

    useEffect(() => { fetch(); }, [fetch]);

    function handleSearch(e) {
        e.preventDefault();
        setPage(1);
        setQuery(search);
    }

    return (
        <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-3">
                <form onSubmit={handleSearch} className="flex flex-1 gap-3">
                    <div className="relative flex-1 min-w-[200px]">
                        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                        <input type="text" placeholder="Cari email, nama, perusahaan…"
                            value={search} onChange={e => setSearch(e.target.value)}
                            className="w-full rounded-xl border border-white/10 bg-slate-950/50 pl-9 pr-4 py-2 text-sm text-white placeholder-slate-600 outline-none focus:border-sky-400/30 transition" />
                    </div>
                    <button type="submit"
                        className="rounded-xl bg-slate-800 px-4 py-2 text-sm text-slate-300 hover:text-white border border-white/10 transition">
                        Cari
                    </button>
                </form>
                <button onClick={() => { setEditTarget(null); setModalOpen(true); }}
                    className="flex items-center gap-2 rounded-xl bg-sky-500 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-400 transition">
                    <Plus size={15} /> Tambah Transportir
                </button>
            </div>

            {error && (
                <div className="rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-300">{error}</div>
            )}

            <Table
                columns={TRANS_COLS(
                    (r) => { setEditTarget(r); setModalOpen(true); },
                    (r) => setDeleteTarget(r)
                )}
                data={data?.data}
                loading={loading}
                emptyMessage="Belum ada transportir terdaftar."
            />
            <Pagination meta={data} onPageChange={setPage} />

            <TransportirModal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                onSaved={fetch}
                editUser={editTarget}
                lockedCompany={lockedCompany}
            />
            {deleteTarget && (
                <DeleteConfirm
                    user={deleteTarget}
                    onClose={() => setDeleteTarget(null)}
                    onDeleted={fetch}
                />
            )}
        </div>
    );
}

// ─── Main page ────────────────────────────────────────────────────────────────

const TABS = [
    { key: 'kiosk',       label: 'Kiosk',       icon: Store },
    { key: 'transportir', label: 'Transportir',  icon: Truck },
];

export default function AppUserList({ user }) {
    const isAdminRegion    = user?.role === 'AdminRegion';
    const isAdminTransport = user?.role === 'AdminTransport';
    const isSingleTab      = isAdminRegion || isAdminTransport;

    // AdminTransport langsung ke tab transportir
    const defaultTab = isAdminTransport ? 'transportir' : 'kiosk';
    const [tab, setTab] = useState(defaultTab);

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-semibold text-white">Pengguna Aplikasi</h1>
                {isAdminRegion && (
                    <p className="mt-1 text-sm text-slate-500">
                        Mengelola pengguna kiosk di region{' '}
                        <span className="font-medium text-teal-400">{user.region}</span>
                    </p>
                )}
                {isAdminTransport && (
                    <p className="mt-1 text-sm text-slate-500">
                        Mengelola pengguna transportir di perusahaan{' '}
                        <span className="font-medium text-sky-400">{user.companyName}</span>
                    </p>
                )}
            </div>

            {/* Tab bar — hanya SuperAdmin yang melihat kedua tab */}
            {!isSingleTab && (
                <div className="flex gap-1 rounded-xl border border-white/8 bg-white/3 p-1 w-fit">
                    {TABS.map(({ key, label, icon: Icon }) => (
                        <button
                            key={key}
                            onClick={() => setTab(key)}
                            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition
                                ${tab === key
                                    ? 'bg-white/10 text-white'
                                    : 'text-slate-500 hover:text-slate-300'}`}
                        >
                            <Icon size={15} />
                            {label}
                        </button>
                    ))}
                </div>
            )}

            {(isAdminRegion || tab === 'kiosk') && (
                <KioskTab lockedRegion={isAdminRegion ? user.region : null} />
            )}
            {(isAdminTransport || tab === 'transportir') && (
                <TransportirTab lockedCompany={isAdminTransport ? user.companyName : null} />
            )}
        </div>
    );
}
