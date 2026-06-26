import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Eye, X } from 'lucide-react';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../../api/client';
import { Table } from '../ui/Table';

const STATUS_CFG = {
    pending:  { label: 'Menunggu Persetujuan', color: 'text-amber-300 bg-amber-400/10 border-amber-400/20' },
    approved: { label: 'Disetujui',            color: 'text-emerald-300 bg-emerald-400/10 border-emerald-400/20' },
    rejected: { label: 'Ditolak',              color: 'text-red-300 bg-red-400/10 border-red-400/20' },
};

function StatusChip({ value }) {
    const cfg = STATUS_CFG[value] ?? STATUS_CFG.pending;
    return (
        <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${cfg.color}`}>
            {cfg.label}
        </span>
    );
}

function formatDateTime(val) {
    if (!val) return '—';
    return new Date(val).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
}

function DetailRow({ label, value }) {
    return (
        <div>
            <p className="text-xs text-slate-500">{label}</p>
            <p className="text-sm text-white">{value || '—'}</p>
        </div>
    );
}

function GudangDetailModal({ open, onClose, target }) {
    const mapRef = useRef(null);

    useEffect(() => {
        if (!open || !target?.latitude || !target?.longitude || !mapRef.current) return;

        const center = [parseFloat(target.latitude), parseFloat(target.longitude)];
        const map = L.map(mapRef.current, {
            zoomControl: false, dragging: false, scrollWheelZoom: false, doubleClickZoom: false,
        }).setView(center, 15);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            maxZoom: 19,
        }).addTo(map);
        L.marker(center).addTo(map);

        return () => map.remove();
    }, [open, target]);

    if (!open || !target) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={onClose} />
            <div className="relative z-10 w-full max-w-lg rounded-2xl border border-white/10 bg-slate-900 shadow-2xl">
                <div className="flex items-center justify-between border-b border-white/8 px-6 py-4">
                    <h2 className="text-base font-semibold text-white">Detail Gudang</h2>
                    <button onClick={onClose} className="rounded-lg p-1 text-slate-500 hover:text-white transition"><X size={18} /></button>
                </div>

                <div className="max-h-[70vh] overflow-y-auto px-6 py-5 space-y-4">
                    <div className="flex items-center justify-between gap-3">
                        <h3 className="text-base font-semibold text-white">{target.nama_gudang}</h3>
                        <StatusChip value={target.status} />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <DetailRow label="Nama PIC" value={target.nama_pic} />
                        <DetailRow label="No. Telp" value={target.no_telp} />
                        <DetailRow label="Region" value={target.region?.nama_reg} />
                        <DetailRow label="Propinsi" value={target.propinsi?.nama_pro} />
                        <DetailRow label="Kelurahan" value={target.kelurahan} />
                        <DetailRow label="Kode Pos" value={target.kode_pos} />
                    </div>

                    <div>
                        <p className="text-xs text-slate-500">Wilayah Cakupan</p>
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                            {(target.kecamatans ?? []).length === 0 && <span className="text-sm text-white">—</span>}
                            {(target.kecamatans ?? []).map(k => (
                                <span key={k.id} className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-slate-300">
                                    {k.nama_kec} ({k.kabupaten?.nama_kab})
                                </span>
                            ))}
                        </div>
                    </div>

                    <DetailRow label="Alamat Lengkap" value={target.alamat_gudang} />

                    {target.latitude && target.longitude && (
                        <div id="map" ref={mapRef} className="h-40 w-full rounded-xl border border-white/10 bg-slate-800" />
                    )}

                    <div className="grid grid-cols-2 gap-3 border-t border-white/8 pt-3">
                        <DetailRow label="Diajukan Oleh" value={target.submitted_by} />
                        <DetailRow label="Tanggal Ajuan" value={formatDateTime(target.created_at)} />
                    </div>

                    {(target.reviewed_by || target.review_note) && (
                        <div className="space-y-1 rounded-xl border border-white/8 bg-white/3 px-4 py-3">
                            <p className="text-xs text-slate-500">
                                Ditinjau oleh {target.reviewed_by || '—'}
                                {target.reviewed_at ? ` · ${formatDateTime(target.reviewed_at)}` : ''}
                            </p>
                            {target.review_note && <p className="text-sm text-slate-300">{target.review_note}</p>}
                        </div>
                    )}
                </div>

                <div className="flex justify-end gap-3 border-t border-white/8 px-6 py-4">
                    <button onClick={onClose}
                        className="rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-400 hover:text-white transition">
                        Tutup
                    </button>
                </div>
            </div>
        </div>
    );
}

// Daftar gudang yang sudah disetujui (lihat fitur "Ajuan Gudang" milik AdminRegion
// dan tab "Ajuan Gudang" pada Persetujuan SuperAdmin). Halaman ini hanya menampilkan,
// pengelolaan (tambah/ubah/hapus) dilakukan lewat alur ajuan + persetujuan tersebut.
export default function WarehouseList({ user }) {
    const [data,    setData]    = useState([]);
    const [loading, setLoading] = useState(true);
    const [error,   setError]   = useState(null);
    const [detailTarget, setDetailTarget] = useState(null);
    const isAdminTransport = user?.role === 'AdminTransport';

    const fetchData = useCallback(() => {
        setLoading(true);
        api.get('/gudang-submissions', { status: 'approved' })
            .then(setData)
            .catch(e => setError(e.message))
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const columns = [
        { key: 'nama_gudang', label: 'Nama Gudang' },
        { key: 'region',      label: 'Region', render: r => r.region?.nama_reg || '—' },
        { key: 'kabupaten',   label: 'Kabupaten/Kota', render: r => {
            const names = [...new Set((r.kecamatans ?? []).map(k => k.kabupaten?.nama_kab).filter(Boolean))];
            if (names.length === 0) return '—';
            return <span title={names.join(', ')}>{names.length > 1 ? `${names[0]} +${names.length - 1}` : names[0]}</span>;
        } },
        { key: 'kecamatan',   label: 'Kecamatan', render: r => {
            const list = r.kecamatans ?? [];
            if (list.length === 0) return '—';
            const names = list.map(k => k.nama_kec);
            return <span title={names.join(', ')}>{list.length > 1 ? `${names[0]} +${list.length - 1}` : names[0]}</span>;
        } },
        { key: 'alamat_gudang', label: 'Alamat', render: r => r.alamat_gudang || '—' },
        { key: 'no_telp',     label: 'No. Telp', render: r => r.no_telp || '—' },
        {
            key: 'coord', label: 'Koordinat',
            render: r => (r.latitude && r.longitude) ? `${r.latitude}, ${r.longitude}` : '—',
        },
        {
            key: '_actions', label: '',
            render: (r) => (
                <div className="flex items-center justify-end">
                    <button onClick={() => setDetailTarget(r)}
                        className="rounded-lg p-1.5 text-slate-500 hover:text-teal-400 hover:bg-teal-400/10 transition" title="Detail">
                        <Eye size={15} />
                    </button>
                </div>
            ),
        },
    ];

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-semibold text-white">Daftar Gudang</h1>
                <p className="mt-1 text-sm text-slate-500">
                    {isAdminTransport
                        ? 'Gudang yang sudah disetujui dan wilayah cakupannya beririsan dengan wilayah kerja Anda.'
                        : 'Gudang yang sudah disetujui, dipilih saat alokasi sopir. Pengajuan gudang baru dilakukan oleh Admin Region.'}
                </p>
            </div>

            {error && (
                <div className="rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-300">{error}</div>
            )}

            <Table columns={columns} data={data} loading={loading} emptyMessage={
                isAdminTransport
                    ? 'Belum ada gudang yang disetujui di wilayah kerja Anda. Kalau ini tidak sesuai harapan, hubungi SuperAdmin untuk memastikan wilayah kerja (kecamatan) akun Anda sudah diatur di menu Admin Transport.'
                    : 'Belum ada gudang yang disetujui.'
            } />

            <GudangDetailModal
                open={Boolean(detailTarget)}
                onClose={() => setDetailTarget(null)}
                target={detailTarget}
            />
        </div>
    );
}
