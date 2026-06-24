import React, { useCallback, useEffect, useState } from 'react';
import { api } from '../../api/client';
import { Table } from '../ui/Table';

// Daftar gudang yang sudah disetujui (lihat fitur "Ajuan Gudang" milik AdminRegion
// dan tab "Ajuan Gudang" pada Persetujuan SuperAdmin). Halaman ini hanya menampilkan,
// pengelolaan (tambah/ubah/hapus) dilakukan lewat alur ajuan + persetujuan tersebut.
export default function WarehouseList() {
    const [data,    setData]    = useState([]);
    const [loading, setLoading] = useState(true);
    const [error,   setError]   = useState(null);

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
        { key: 'kecamatan',   label: 'Wilayah Cakupan', render: r => {
            const list = r.kecamatans ?? [];
            if (list.length === 0) return '—';
            return <span title={list.map(k => k.nama_kec).join(', ')}>{list.length} kecamatan</span>;
        } },
        { key: 'alamat_gudang', label: 'Alamat', render: r => r.alamat_gudang || '—' },
        { key: 'no_telp',     label: 'No. Telp', render: r => r.no_telp || '—' },
        {
            key: 'coord', label: 'Koordinat',
            render: r => (r.latitude && r.longitude) ? `${r.latitude}, ${r.longitude}` : '—',
        },
    ];

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-semibold text-white">Daftar Gudang</h1>
                <p className="mt-1 text-sm text-slate-500">
                    Gudang yang sudah disetujui, dipilih saat alokasi sopir. Pengajuan gudang baru dilakukan oleh Admin Region.
                </p>
            </div>

            {error && (
                <div className="rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-300">{error}</div>
            )}

            <Table columns={columns} data={data} loading={loading} emptyMessage="Belum ada gudang yang disetujui." />
        </div>
    );
}
