import { X } from 'lucide-react';
import React, { useMemo, useState } from 'react';

// Bangun index id(string) -> { id, nama_kec, kabupatenId, kabupatenNama, propinsiNama }
// dari struktur wilayah { propinsis: [{ kabupatens: [{ kecamatans: [...] }] }] }.
export function buildKecamatanIndex(wilayah) {
    const map = new Map();
    for (const p of wilayah?.propinsis ?? []) {
        for (const k of p.kabupatens ?? []) {
            for (const c of k.kecamatans ?? []) {
                map.set(String(c.id), {
                    id: c.id,
                    nama_kec: c.nama_kec,
                    kabupatenId: k.id,
                    kabupatenNama: k.nama_kab,
                    propinsiNama: p.nama_pro,
                });
            }
        }
    }
    return map;
}

function Select({ error, children, ...props }) {
    return (
        <select
            className={`w-full rounded-xl border bg-slate-900 px-3 py-2 text-sm text-white outline-none transition disabled:opacity-50
                ${error ? 'border-red-400/60' : 'border-white/10 focus:border-teal-400/40'}`}
            {...props}
        >
            {children}
        </select>
    );
}

// Picker kecamatan banyak-pilih: pilih propinsi -> kabupaten (staging, tidak disimpan),
// lalu centang kecamatan di bawahnya. Hasil terkumpul ditampilkan sebagai chip yang bisa
// dihapus satu-satu, dan bisa berasal dari kabupaten manapun yang pernah dipilih.
export default function KecamatanMultiPicker({ wilayah, selectedIds, onChange, disabledHint }) {
    const [stagingPropinsiId, setStagingPropinsiId] = useState('');
    const [stagingKabupatenId, setStagingKabupatenId] = useState('');

    const propinsiList  = wilayah?.propinsis ?? [];
    const kabupatenList = propinsiList.find(p => String(p.id) === String(stagingPropinsiId))?.kabupatens ?? [];
    const kecamatanList = kabupatenList.find(k => String(k.id) === String(stagingKabupatenId))?.kecamatans ?? [];

    const kecamatanIndex = useMemo(() => buildKecamatanIndex(wilayah), [wilayah]);

    function toggle(id) {
        const idStr = String(id);
        onChange(selectedIds.includes(idStr) ? selectedIds.filter(x => x !== idStr) : [...selectedIds, idStr]);
    }

    function remove(id) {
        onChange(selectedIds.filter(x => x !== String(id)));
    }

    if (disabledHint) {
        return <p className="text-xs text-slate-600">{disabledHint}</p>;
    }

    return (
        <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
                <Select
                    value={stagingPropinsiId}
                    onChange={e => { setStagingPropinsiId(e.target.value); setStagingKabupatenId(''); }}
                >
                    <option value="">-- Pilih Propinsi --</option>
                    {propinsiList.map(p => <option key={p.id} value={p.id}>{p.nama_pro}</option>)}
                </Select>

                <Select
                    value={stagingKabupatenId}
                    onChange={e => setStagingKabupatenId(e.target.value)}
                    disabled={!stagingPropinsiId}
                >
                    <option value="">-- Pilih Kabupaten/Kota --</option>
                    {kabupatenList.map(k => <option key={k.id} value={k.id}>{k.nama_kab}</option>)}
                </Select>
            </div>

            {stagingKabupatenId && (
                <div className="max-h-40 space-y-1 overflow-y-auto rounded-xl border border-white/10 bg-slate-950/40 p-3">
                    {kecamatanList.length === 0 && <p className="text-xs text-slate-500">Tidak ada data kecamatan.</p>}
                    {kecamatanList.map(c => (
                        <label key={c.id} className="flex items-center gap-2 text-sm text-slate-300">
                            <input
                                type="checkbox"
                                checked={selectedIds.includes(String(c.id))}
                                onChange={() => toggle(c.id)}
                            />
                            {c.nama_kec}
                        </label>
                    ))}
                </div>
            )}

            <div className="flex flex-wrap gap-2">
                {selectedIds.length === 0 && <p className="text-xs text-slate-500">Belum ada kecamatan dipilih.</p>}
                {selectedIds.map(id => {
                    const info = kecamatanIndex.get(String(id));
                    return (
                        <span key={id} className="inline-flex items-center gap-1.5 rounded-full border border-teal-400/20 bg-teal-400/10 px-2.5 py-1 text-xs text-teal-300">
                            {info ? `${info.nama_kec} (${info.kabupatenNama})` : `#${id}`}
                            <button type="button" onClick={() => remove(id)} className="text-teal-300/70 hover:text-white">
                                <X size={12} />
                            </button>
                        </span>
                    );
                })}
            </div>
        </div>
    );
}
