import { Save } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { api } from '../../api/client';

function formatUnit(unit) {
    if (!unit) return '';
    if (unit === 'IDR') return 'Rp';
    if (unit === 'IDR/km') return 'Rp/km';
    if (unit === '%') return '%';
    return unit;
}

function FeeSettingsCard() {
    const [settings, setSettings] = useState([]);
    const [loading,  setLoading]  = useState(true);
    const [saving,   setSaving]   = useState(false);
    const [saved,    setSaved]    = useState(false);
    const [error,    setError]    = useState(null);
    const [values,   setValues]   = useState({});

    useEffect(() => {
        api.get('/settings/fees')
            .then(data => {
                setSettings(data);
                const init = {};
                data.forEach(s => { init[s.key] = s.value ?? ''; });
                setValues(init);
            })
            .catch(e => setError(e.message))
            .finally(() => setLoading(false));
    }, []);

    async function handleSave(e) {
        e.preventDefault();
        setSaving(true);
        setError(null);
        setSaved(false);
        try {
            const payload = settings.map(s => ({ key: s.key, value: values[s.key] ?? '' }));
            const updated = await api.put('/settings/fees', { settings: payload });
            setSettings(updated);
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        } catch (err) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    }

    if (loading) {
        return (
            <div className="space-y-3">
                {[1, 2, 3, 4].map(i => (
                    <div key={i} className="h-12 animate-pulse rounded-xl bg-white/5" />
                ))}
            </div>
        );
    }

    return (
        <form onSubmit={handleSave} className="space-y-4">
            {error && (
                <div className="rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-300">{error}</div>
            )}
            {saved && (
                <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-300">
                    Pengaturan berhasil disimpan.
                </div>
            )}

            <div className="space-y-3">
                {settings.map(s => (
                    <div key={s.key} className="flex items-center gap-4">
                        <label className="w-56 shrink-0 text-sm text-slate-300">{s.label ?? s.key}</label>
                        <div className="relative flex-1">
                            <input
                                type="number"
                                step="any"
                                min="0"
                                value={values[s.key] ?? ''}
                                onChange={e => setValues(v => ({ ...v, [s.key]: e.target.value }))}
                                className="w-full rounded-xl border border-white/10 bg-slate-950/50 px-3 py-2 pr-14 text-sm text-white outline-none focus:border-amber-400/40 transition"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500">
                                {formatUnit(s.unit)}
                            </span>
                        </div>
                    </div>
                ))}
            </div>

            <div className="flex justify-end">
                <button
                    type="submit"
                    disabled={saving}
                    className="flex items-center gap-2 rounded-xl bg-amber-400 px-5 py-2.5 text-sm font-semibold text-slate-950 hover:bg-amber-300 disabled:opacity-50 transition"
                >
                    <Save size={15} />
                    {saving ? 'Menyimpan…' : 'Simpan Pengaturan'}
                </button>
            </div>
        </form>
    );
}

export default function SystemSettings({ user }) {
    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-semibold text-white">System Settings</h1>

            {/* Fee Settings */}
            <div className="rounded-2xl border border-white/8 bg-slate-950/55 p-6">
                <h2 className="mb-1 text-base font-semibold text-white">Biaya &amp; Pajak</h2>
                <p className="mb-5 text-sm text-slate-400">
                    Atur tarif biaya pengiriman, PPH, dan PPN yang digunakan dalam kalkulasi order.
                </p>
                <FeeSettingsCard />
            </div>

            {/* Admin credentials info */}
            <div className="rounded-2xl border border-white/8 bg-slate-950/55 p-6">
                <h2 className="mb-2 text-base font-semibold text-white">Admin Credentials</h2>
                <p className="text-sm text-slate-400 leading-6">
                    Password admin console dikelola melalui artisan command di server. Untuk mengatur atau mereset password admin, jalankan:
                </p>
                <pre className="mt-4 overflow-x-auto rounded-xl border border-white/8 bg-slate-950 p-4 text-sm text-amber-300 font-mono">
{`php artisan admin:set-password {email} {password}`}
                </pre>
                <p className="mt-3 text-xs text-slate-500">
                    Perintah ini akan membuat atau memperbarui credential admin console tanpa menyentuh password aplikasi user (Flutter).
                </p>
            </div>

            {/* Current session */}
            <div className="rounded-2xl border border-white/8 bg-slate-950/55 p-6">
                <h2 className="mb-4 text-base font-semibold text-white">Sesi Aktif</h2>
                <div className="space-y-2 text-sm text-slate-300">
                    <p><span className="text-slate-500">Email:</span> {user.email}</p>
                    <p><span className="text-slate-500">Role:</span> {user.role}</p>
                    <p><span className="text-slate-500">Display name:</span> {user.displayName || '—'}</p>
                </div>
            </div>

            {/* Database posture reminder */}
            <div className="rounded-2xl border border-emerald-400/15 bg-emerald-400/5 p-6">
                <div className="flex items-center gap-3 mb-3">
                    <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs text-emerald-200">Shared DB safe</span>
                    <h2 className="text-base font-semibold text-white">Database Posture</h2>
                </div>
                <ul className="space-y-2 text-sm text-slate-400">
                    <li>Admin console membaca &amp; menulis tabel <code className="text-emerald-300">Products</code> (CRUD via SuperAdmin).</li>
                    <li>Tabel <code className="text-emerald-300">settings</code> dan <code className="text-emerald-300">admin_credentials</code> adalah tabel khusus admin console.</li>
                    <li>Tabel <code className="text-emerald-300">Orders</code>, <code className="text-emerald-300">Users</code>, <code className="text-emerald-300">Notifications</code> hanya dibaca (tidak dimodifikasi).</li>
                </ul>
            </div>
        </div>
    );
}
