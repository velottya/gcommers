import React, { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { Table } from '../ui/Table';

function formatRupiah(val) {
    if (val == null) return '—';
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);
}

export default function TarifTransportir({ user }) {
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
                <h1 className="text-2xl font-semibold text-white">Tarif Mitra Transportir</h1>
                <p className="mt-1 text-sm text-slate-500">
                    Atur biaya pengiriman (Rp/kg) untuk tiap mitra transportir di region {user?.region}. Tarif ini otomatis
                    dipakai saat mengatur Alokasi Biaya.
                </p>
            </div>

            {error && (
                <div className="rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-300">{error}</div>
            )}

            <Table columns={columns} data={data} loading={loading} emptyMessage="Belum ada mitra transportir terdaftar." />
        </div>
    );
}
