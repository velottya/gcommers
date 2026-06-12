import { Info } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { api } from '../../api/client';

function formatUnit(unit) {
    if (!unit) return '';
    if (unit === 'IDR') return 'Rp';
    if (unit === 'IDR/km') return 'Rp/km';
    if (unit === '%') return '%';
    return unit;
}

function formatValue(value, unit) {
    if (value == null) return '—';
    if (unit === 'IDR' || unit === 'IDR/km') {
        return new Intl.NumberFormat('id-ID').format(value);
    }
    return value;
}

export default function BiayaPengiriman() {
    const [settings, setSettings] = useState([]);
    const [loading,  setLoading]  = useState(true);
    const [error,    setError]    = useState(null);

    useEffect(() => {
        api.get('/settings/fees-view')
            .then(setSettings)
            .catch(e => setError(e.message))
            .finally(() => setLoading(false));
    }, []);

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-semibold text-white">Alokasi Biaya Pengiriman</h1>
                <p className="mt-1 text-sm text-slate-500">
                    Tarif pengiriman dan pajak yang berlaku. Perubahan dilakukan oleh SuperAdmin.
                </p>
            </div>

            <div className="rounded-2xl border border-white/8 bg-slate-950/55 p-6">
                <div className="mb-4 flex items-center gap-2">
                    <Info size={15} className="text-teal-400" />
                    <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Tarif Berlaku</h2>
                </div>

                {error && (
                    <div className="rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-300">{error}</div>
                )}

                {loading ? (
                    <div className="space-y-3">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="h-12 animate-pulse rounded-xl bg-white/5" />
                        ))}
                    </div>
                ) : (
                    <div className="divide-y divide-white/6">
                        {settings.map(s => (
                            <div key={s.key} className="flex items-center justify-between py-4">
                                <div>
                                    <p className="text-sm font-medium text-slate-200">{s.label ?? s.key}</p>
                                    <p className="text-xs text-slate-500">{s.key}</p>
                                </div>
                                <div className="text-right">
                                    <span className="text-lg font-semibold text-teal-300">
                                        {formatValue(s.value, s.unit)}
                                    </span>
                                    <span className="ml-1.5 text-sm text-slate-500">{formatUnit(s.unit)}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="rounded-2xl border border-teal-400/15 bg-teal-400/5 p-5">
                <p className="text-sm text-slate-400 leading-6">
                    Tarif di atas digunakan untuk menghitung <span className="text-teal-300">ongkos kirim</span>,{' '}
                    <span className="text-teal-300">PPH</span>, dan <span className="text-teal-300">PPN</span> pada setiap order.
                    Jika ada keberatan terhadap tarif yang berlaku, hubungi SuperAdmin untuk penyesuaian.
                </p>
            </div>
        </div>
    );
}
