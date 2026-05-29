import { Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../../api/client';
import StatusBadge from '../ui/StatusBadge';
import { Pagination, Table } from '../ui/Table';

// ─── helpers ────────────────────────────────────────────────────────────────

function formatDate(val) {
    if (!val) return '—';
    return new Date(val).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

const ROLE_OPTIONS = [
    { value: 'SuperAdmin',     label: 'SuperAdmin' },
    { value: 'AdminRegion',    label: 'AdminRegion' },
    { value: 'AdminTransport', label: 'AdminTransport' },
];

const EMPTY_FORM = {
    Email: '', DisplayName: '', Role: 'AdminRegion', Phone: '',
    Region: '', CompanyName: '', TransportirName: '', PoliceNumber: '', PicName: '',
    password: '',
};

// ─── Field helper ────────────────────────────────────────────────────────────

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
                ${error ? 'border-red-400/60 focus:border-red-400' : 'border-white/10 focus:border-amber-400/40'}`}
            {...props}
        />
    );
}

function Select({ error, children, ...props }) {
    return (
        <select
            className={`w-full rounded-xl border bg-slate-900 px-3 py-2 text-sm text-white outline-none transition
                ${error ? 'border-red-400/60' : 'border-white/10 focus:border-amber-400/40'}`}
            {...props}
        >
            {children}
        </select>
    );
}

// ─── Modal ──────────────────────────────────────────────────────────────────

function AdminUserModal({ open, onClose, onSaved, editUser }) {
    const [form, setForm]     = useState(EMPTY_FORM);
    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState({});
    const firstRef            = useRef(null);

    useEffect(() => {
        if (!open) return;
        setErrors({});
        if (editUser) {
            setForm({ ...EMPTY_FORM, ...editUser, password: '' });
        } else {
            setForm(EMPTY_FORM);
        }
        setTimeout(() => firstRef.current?.focus(), 50);
    }, [open, editUser]);

    if (!open) return null;

    const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

    async function handleSubmit(e) {
        e.preventDefault();
        setSaving(true);
        setErrors({});
        try {
            if (editUser) {
                await api.put(`/users/${editUser.Id}`, form);
            } else {
                await api.post('/users', form);
            }
            onSaved();
            onClose();
        } catch (err) {
            if (err.status === 422) {
                setErrors(err.errors || { _: [err.message] });
            } else {
                setErrors({ _: [err.message || 'Terjadi kesalahan.'] });
            }
        } finally {
            setSaving(false);
        }
    }

    const isEdit = Boolean(editUser);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* backdrop */}
            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={onClose} />

            <div className="relative z-10 w-full max-w-lg rounded-2xl border border-white/10 bg-slate-900 shadow-2xl">
                {/* header */}
                <div className="flex items-center justify-between border-b border-white/8 px-6 py-4">
                    <h2 className="text-base font-semibold text-white">
                        {isEdit ? 'Edit Admin' : 'Tambah Admin Baru'}
                    </h2>
                    <button onClick={onClose} className="rounded-lg p-1 text-slate-500 hover:text-white transition">
                        <X size={18} />
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="max-h-[70vh] overflow-y-auto px-6 py-5 space-y-4">
                        {errors._ && (
                            <div className="rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-300">
                                {errors._.join(' ')}
                            </div>
                        )}

                        {/* Email — readonly on edit */}
                        <Field label="Email" error={errors.Email?.[0]}>
                            <Input
                                ref={firstRef}
                                type="email"
                                value={form.Email}
                                onChange={set('Email')}
                                disabled={isEdit}
                                placeholder="admin@email.com"
                                error={errors.Email?.[0]}
                            />
                            {isEdit && <p className="mt-1 text-xs text-slate-600">Email tidak bisa diubah.</p>}
                        </Field>

                        <Field label="Nama Lengkap" error={errors.DisplayName?.[0]}>
                            <Input
                                type="text"
                                value={form.DisplayName}
                                onChange={set('DisplayName')}
                                placeholder="Nama lengkap"
                                error={errors.DisplayName?.[0]}
                            />
                        </Field>

                        <div className="grid grid-cols-2 gap-4">
                            <Field label="Role" error={errors.Role?.[0]}>
                                <Select value={form.Role} onChange={set('Role')} error={errors.Role?.[0]}>
                                    {ROLE_OPTIONS.map(o => (
                                        <option key={o.value} value={o.value}>{o.label}</option>
                                    ))}
                                </Select>
                            </Field>

                            <Field label="No. Telepon" error={errors.Phone?.[0]}>
                                <Input
                                    type="text"
                                    value={form.Phone}
                                    onChange={set('Phone')}
                                    placeholder="08xx"
                                    error={errors.Phone?.[0]}
                                />
                            </Field>
                        </div>

                        {/* Role-specific fields */}
                        {form.Role === 'AdminRegion' && (
                            <Field label="Region" error={errors.Region?.[0]}>
                                <Input
                                    type="text"
                                    value={form.Region}
                                    onChange={set('Region')}
                                    placeholder="Contoh: Jawa Barat"
                                    error={errors.Region?.[0]}
                                />
                            </Field>
                        )}

                        {form.Role === 'AdminTransport' && (
                            <div className="space-y-4">
                                <Field label="Nama Perusahaan" error={errors.CompanyName?.[0]}>
                                    <Input type="text" value={form.CompanyName} onChange={set('CompanyName')}
                                        placeholder="PT. Contoh" error={errors.CompanyName?.[0]} />
                                </Field>
                            </div>
                        )}

                        {/* Password */}
                        <Field
                            label={isEdit ? 'Password Baru (kosongkan jika tidak diubah)' : 'Password'}
                            error={errors.password?.[0]}
                        >
                            <Input
                                type="password"
                                value={form.password}
                                onChange={set('password')}
                                placeholder={isEdit ? '••••••••' : 'Min. 8 karakter'}
                                error={errors.password?.[0]}
                            />
                        </Field>
                    </div>

                    {/* footer */}
                    <div className="flex justify-end gap-3 border-t border-white/8 px-6 py-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-400 hover:text-white transition"
                        >
                            Batal
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="rounded-xl bg-amber-400 px-5 py-2 text-sm font-semibold text-slate-950 hover:bg-amber-300 disabled:opacity-50 transition"
                        >
                            {saving ? 'Menyimpan…' : isEdit ? 'Simpan Perubahan' : 'Buat Admin'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ─── Delete confirm ──────────────────────────────────────────────────────────

function DeleteConfirm({ user, onClose, onDeleted }) {
    const [deleting, setDeleting] = useState(false);
    const [error, setError]       = useState(null);

    async function handleDelete() {
        setDeleting(true);
        setError(null);
        try {
            await api.del(`/users/${user.Id}`);
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
                <h2 className="text-base font-semibold text-white">Hapus Admin?</h2>
                <p className="mt-2 text-sm text-slate-400">
                    Akun <span className="text-white font-medium">{user.DisplayName}</span> ({user.Email}) akan dihapus
                    beserta kredensial login-nya. Tindakan ini tidak dapat dibatalkan.
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

// ─── Main page ───────────────────────────────────────────────────────────────

export default function UserList({ user }) {
    const isSuperAdmin = user.role === 'SuperAdmin';

    const [data,    setData]    = useState(null);
    const [loading, setLoading] = useState(true);
    const [error,   setError]   = useState(null);
    const [page,    setPage]    = useState(1);
    const [search,  setSearch]  = useState('');
    const [role,    setRole]    = useState('');
    const [query,   setQuery]   = useState({ search: '', role: '' });

    const [modalOpen,   setModalOpen]   = useState(false);
    const [editTarget,  setEditTarget]  = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);

    const fetchUsers = useCallback(() => {
        setLoading(true);
        api.get('/users', { page, ...query })
            .then(setData)
            .catch(e => setError(e.message))
            .finally(() => setLoading(false));
    }, [page, query]);

    useEffect(() => { fetchUsers(); }, [fetchUsers]);

    function handleSearch(e) {
        e.preventDefault();
        setPage(1);
        setQuery({ search, role });
    }

    function openCreate() {
        setEditTarget(null);
        setModalOpen(true);
    }

    function openEdit(row) {
        setEditTarget(row);
        setModalOpen(true);
    }

    const roleFilterOptions = isSuperAdmin
        ? [{ value: '', label: 'Semua role' }, ...ROLE_OPTIONS]
        : [{ value: '', label: 'Semua role' }, { value: 'AdminRegion', label: 'AdminRegion' }, { value: 'AdminTransport', label: 'AdminTransport' }];

    const COLUMNS = [
        { key: 'DisplayName', label: 'Nama' },
        { key: 'Email',       label: 'Email' },
        { key: 'Role',        label: 'Role',   render: r => <StatusBadge value={r.Role} /> },
        { key: 'Phone',       label: 'Telepon' },
        { key: 'CreatedAt',   label: 'Bergabung', render: r => formatDate(r.CreatedAt) },
        ...(isSuperAdmin ? [{
            key: '_actions',
            label: '',
            render: (r) => (
                <div className="flex items-center gap-2 justify-end">
                    <button
                        onClick={() => openEdit(r)}
                        className="rounded-lg p-1.5 text-slate-500 hover:text-amber-400 hover:bg-amber-400/10 transition"
                        title="Edit"
                    >
                        <Pencil size={15} />
                    </button>
                    <button
                        onClick={() => setDeleteTarget(r)}
                        className="rounded-lg p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-400/10 transition"
                        title="Hapus"
                        disabled={String(r.Id) === String(user.id)}
                    >
                        <Trash2 size={15} />
                    </button>
                </div>
            ),
        }] : []),
    ];

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between gap-4">
                <h1 className="text-2xl font-semibold text-white">
                    {user.role === 'AdminRegion' ? 'Regional Admins' : 'Admin Users'}
                </h1>
                {isSuperAdmin && (
                    <button
                        onClick={openCreate}
                        className="flex items-center gap-2 rounded-xl bg-amber-400 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-amber-300 transition"
                    >
                        <Plus size={16} />
                        Tambah Admin
                    </button>
                )}
            </div>

            <form onSubmit={handleSearch} className="flex flex-wrap gap-3">
                <div className="relative flex-1 min-w-[200px]">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                        type="text"
                        placeholder="Cari nama atau email…"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full rounded-xl border border-white/10 bg-slate-950/50 pl-9 pr-4 py-2.5 text-sm text-white placeholder-slate-600 outline-none focus:border-amber-400/30 transition"
                    />
                </div>
                <select
                    value={role}
                    onChange={e => setRole(e.target.value)}
                    className="rounded-xl border border-white/10 bg-slate-950/50 px-3 py-2.5 text-sm text-slate-300 outline-none"
                >
                    {roleFilterOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <button type="submit" className="rounded-xl bg-amber-400 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-amber-300 transition">
                    Cari
                </button>
            </form>

            {error && (
                <div className="rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-300">{error}</div>
            )}

            <Table columns={COLUMNS} data={data?.data} loading={loading} emptyMessage="Tidak ada user admin ditemukan." />
            <Pagination meta={data} onPageChange={setPage} />

            {/* Modals */}
            <AdminUserModal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                onSaved={fetchUsers}
                editUser={editTarget}
            />

            {deleteTarget && (
                <DeleteConfirm
                    user={deleteTarget}
                    onClose={() => setDeleteTarget(null)}
                    onDeleted={fetchUsers}
                />
            )}
        </div>
    );
}
