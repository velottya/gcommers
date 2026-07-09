import { MapPin, X } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { Table } from '../ui/Table';

function formatRupiah(val) {
    if (val == null) return '—';
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);
}

// ── Drawer: tarif per kecamatan untuk satu mitra ────────────────────────────

function KecamatanRateDrawer({ companyName, onClose, onSaved }) {
    const [data,    setData]    = useState(null);
    const [loading, setLoading] = useState(true);
    const [error,   setError]   = useState(null);
    const [saving,  setSaving]  = useState(false);
    const [edits,   setEdits]   = useState({}); // { [kecamatanId]: string }

    useEffect(() => {
        setLoading(true);
        api.get('/transport-partner-rates/kecamatan', { company: companyName })
            .then(d => { setData(d); setEdits({}); })
            .catch(e => setError(e.message || 'Gagal memuat data kecamatan.'))
            .finally(() => setLoading(false));
    }, [companyName]);

    useEffect(() => {
        function onKey(e) { if (e.key === 'Escape') onClose(); }
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [onClose]);

    function handleBackdrop(e) {
        if (e.target === e.currentTarget) onClose();
    }

    function setEdit(kecId, val) {
        setEdits(prev => ({ ...prev, [kecId]: val }));
    }

    const dirtyCount = Object.keys(edits).length;

    async function handleSave() {
        if (dirtyCount === 0) return;
        setSaving(true);
        setError(null);
        try {
            const rates = Object.entries(edits).map(([kecamatan_id, val]) => ({
                kecamatan_id: Number(kecamatan_id),
                shipping_cost_per_kg: val === '' ? null : parseFloat(val),
            }));
            await api.post('/transport-partner-rates/kecamatan', { company_name: companyName, rates });
            const fresh = await api.get('/transport-partner-rates/kecamatan', { company: companyName });
            setData(fresh);
            setEdits({});
            onSaved?.();
        } catch (err) {
            setError(err.message || 'Gagal menyimpan tarif.');
        } finally {
            setSaving(false);
        }
    }

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
            onClick={handleBackdrop}
        >
            <div className="relative flex w-full max-w-2xl max-h-[85vh] flex-col bg-[#0d1117] border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="flex items-start justify-between gap-4 border-b border-white/8 px-6 py-4">
                    <div>
                        <div className="flex items-center gap-2 text-xs font-mono text-slate-500">
                            <MapPin size={13} className="text-teal-400" /> Tarif per Kecamatan
                        </div>
                        <h2 className="mt-1 text-lg font-semibold text-white">{companyName}</h2>
                        {data && (
                            <p className="text-xs text-slate-500 mt-0.5">
                                Tarif default: {data.default_rate != null ? `${formatRupiah(data.default_rate)}/kg` : 'belum diatur'} — dipakai kalau kecamatan di bawah dikosongkan.
                            </p>
                        )}
                    </div>
                    <button onClick={onClose} className="rounded-lg p-1.5 text-slate-500 hover:text-white hover:bg-white/5 transition shrink-0">
                        <X size={18} />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
                    {loading && (
                        <div className="space-y-3">
                            {[1, 2, 3].map(i => <div key={i} className="h-10 animate-pulse rounded-xl bg-white/5" />)}
                        </div>
                    )}

                    {error && (
                        <div className="rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-300">{error}</div>
                    )}

                    {!loading && data && data.kabupatens.map(kab => (
                        <div key={kab.id}>
                            <h3 className="text-xs font-semibold uppercase tracking-[0.15em] text-teal-400/80 border-b border-teal-400/20 pb-2 mb-2">
                                {kab.nama_kab}
                            </h3>
                            <div className="space-y-1.5">
                                {kab.kecamatans.map(kec => {
                                    const hasEdit  = Object.prototype.hasOwnProperty.call(edits, kec.id);
                                    const value    = hasEdit ? edits[kec.id] : (kec.shipping_cost_per_kg != null ? String(kec.shipping_cost_per_kg) : '');
                                    const isOverride = kec.shipping_cost_per_kg != null;
                                    return (
                                        <div key={kec.id} className="flex items-center justify-between gap-3 rounded-lg px-3 py-1.5 hover:bg-white/3 transition">
                                            <span className={`text-sm ${isOverride ? 'text-white font-medium' : 'text-slate-400'}`}>
                                                {kec.nama_kec}
                                            </span>
                                            <div className="flex items-center gap-1.5 shrink-0">
                                                <span className="text-xs text-slate-600">Rp</span>
                                                <input
                                                    type="number" min="0" step="1"
                                                    placeholder={data.default_rate != null ? String(data.default_rate) : '—'}
                                                    value={value}
                                                    onChange={e => setEdit(kec.id, e.target.value)}
                                                    className="w-28 rounded-lg border border-white/10 bg-slate-900 px-2 py-1 text-sm text-white text-right outline-none focus:border-teal-400/40 transition"
                                                />
                                                <span className="text-xs text-slate-600">/kg</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between gap-3 border-t border-white/8 px-6 py-4">
                    <p className="text-xs text-slate-500">
                        Kosongkan input untuk memakai tarif default region.
                        {dirtyCount > 0 && <span className="text-teal-400"> {dirtyCount} kecamatan belum disimpan.</span>}
                    </p>
                    <button
                        onClick={handleSave}
                        disabled={saving || dirtyCount === 0}
                        className="rounded-xl bg-teal-500 px-5 py-2 text-sm font-semibold text-white hover:bg-teal-400 disabled:opacity-50 transition shrink-0"
                    >
                        {saving ? 'Menyimpan…' : 'Simpan Perubahan'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── Tab: daftar mitra + tarif default ───────────────────────────────────────

function TarifPartnerTab({ user }) {
    const [data,        setData]        = useState([]);
    const [loading,     setLoading]     = useState(true);
    const [error,       setError]       = useState(null);
    const [editing,     setEditing]     = useState(null);
    const [value,       setValue]       = useState('');
    const [saving,      setSaving]      = useState(false);
    const [kecamatanFor, setKecamatanFor] = useState(null);

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
            key: 'shipping_cost_per_kg', label: 'Tarif Default (Rp/kg)',
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
            key: 'kecamatan_rate_count', label: 'Tarif Khusus Kecamatan',
            render: r => r.kecamatan_rate_count > 0
                ? <span className="text-xs text-teal-300">{r.kecamatan_rate_count} kecamatan</span>
                : <span className="text-xs text-slate-600">—</span>,
        },
        {
            key: '_act', label: '',
            render: r => editing === r.company_name ? null : (
                <div className="flex items-center gap-2 flex-wrap justify-end">
                    <button onClick={() => startEdit(r)}
                        className="rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-slate-300 hover:text-white hover:bg-white/5 transition">
                        {r.shipping_cost_per_kg != null ? 'Ubah Default' : 'Atur Default'}
                    </button>
                    <button onClick={() => setKecamatanFor(r.company_name)}
                        className="flex items-center gap-1.5 rounded-lg border border-teal-400/30 bg-teal-400/10 px-2.5 py-1.5 text-xs font-medium text-teal-300 hover:bg-teal-400/20 transition">
                        <MapPin size={12} /> Per Kecamatan
                    </button>
                </div>
            ),
        },
    ];

    return (
        <div className="space-y-6">
            <div>
                <p className="text-sm text-slate-500">
                    Atur biaya pengiriman (Rp/kg) untuk tiap mitra transportir di region {user?.region}. Tarif default berlaku untuk semua kecamatan,
                    kecuali kecamatan yang sudah diberi tarif khusus lewat tombol &ldquo;Per Kecamatan&rdquo;.
                </p>
            </div>

            {error && (
                <div className="rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-300">{error}</div>
            )}

            <Table columns={columns} data={data} loading={loading} emptyMessage="Belum ada mitra transportir terdaftar." />

            {kecamatanFor && (
                <KecamatanRateDrawer
                    companyName={kecamatanFor}
                    onClose={() => setKecamatanFor(null)}
                    onSaved={fetch}
                />
            )}
        </div>
    );
}

export default function TarifTransportir({ user }) {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-semibold text-white">Tarif Transportir</h1>
                <p className="mt-1 text-sm text-slate-500">Kelola tarif mitra transportir.</p>
            </div>

            <TarifPartnerTab user={user} />
        </div>
    );
}
