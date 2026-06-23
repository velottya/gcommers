import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Eye, Pencil, Plus, Trash2, X } from 'lucide-react';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../../api/client';
import { Table } from '../ui/Table';
import AddressMapField from '../ui/AddressMapField';

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

const EMPTY_FORM = {
    nama_gudang: '', nama_pic: '', no_telp: '',
    propinsi_id: '', kabupaten_id: '', kecamatan_id: '',
    kelurahan: '', kode_pos: '', alamat_gudang: '',
    latitude: '', longitude: '',
};

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
                ${error ? 'border-red-400/60 focus:border-red-400' : 'border-white/10 focus:border-teal-400/40'}`}
            {...props}
        />
    );
}

function Select({ error, children, ...props }) {
    return (
        <select
            className={`w-full rounded-xl border bg-slate-900 px-3 py-2 text-sm text-white outline-none transition disabled:opacity-50
                ${error ? 'border-red-400/60 focus:border-red-400' : 'border-white/10 focus:border-teal-400/40'}`}
            {...props}
        >
            {children}
        </select>
    );
}

function GudangModal({ open, onClose, onSaved, editTarget, wilayah }) {
    const [form, setForm]     = useState(EMPTY_FORM);
    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState({});
    const firstRef            = useRef(null);

    useEffect(() => {
        if (!open) return;
        setErrors({});
        const initial = editTarget ? {
            nama_gudang:   editTarget.nama_gudang,
            nama_pic:      editTarget.nama_pic,
            no_telp:       editTarget.no_telp ?? '',
            propinsi_id:   String(editTarget.propinsi?.id ?? ''),
            kabupaten_id:  String(editTarget.kabupaten?.id ?? ''),
            kecamatan_id:  String(editTarget.kecamatan?.id ?? ''),
            kelurahan:     editTarget.kelurahan ?? '',
            kode_pos:      editTarget.kode_pos ?? '',
            alamat_gudang: editTarget.alamat_gudang ?? '',
            latitude:      editTarget.latitude ?? '',
            longitude:     editTarget.longitude ?? '',
        } : EMPTY_FORM;
        setForm(initial);
        setTimeout(() => firstRef.current?.focus(), 50);
    }, [open, editTarget]);

    if (!open) return null;

    const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));
    const isEdit = Boolean(editTarget);

    const propinsiList  = wilayah?.propinsis ?? [];
    const kabupatenList = propinsiList.find(p => String(p.id) === String(form.propinsi_id))?.kabupatens ?? [];
    const kecamatanList = kabupatenList.find(k => String(k.id) === String(form.kabupaten_id))?.kecamatans ?? [];

    const propinsiNama  = propinsiList.find(p => String(p.id) === String(form.propinsi_id))?.nama_pro;
    const kabupatenNama = kabupatenList.find(k => String(k.id) === String(form.kabupaten_id))?.nama_kab;
    const kecamatanNama = kecamatanList.find(k => String(k.id) === String(form.kecamatan_id))?.nama_kec;

    function setPropinsi(e) {
        setForm(f => ({ ...f, propinsi_id: e.target.value, kabupaten_id: '', kecamatan_id: '' }));
    }

    function setKabupaten(e) {
        setForm(f => ({ ...f, kabupaten_id: e.target.value, kecamatan_id: '' }));
    }

    async function handleSubmit(e) {
        e.preventDefault();
        setSaving(true);
        setErrors({});
        try {
            if (isEdit) {
                await api.put(`/gudang-submissions/${editTarget.id}`, form);
            } else {
                await api.post('/gudang-submissions', form);
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
                    <h2 className="text-base font-semibold text-white">{isEdit ? 'Edit Ajuan Gudang' : 'Ajukan Gudang Baru'}</h2>
                    <button onClick={onClose} className="rounded-lg p-1 text-slate-500 hover:text-white transition"><X size={18} /></button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="max-h-[70vh] overflow-y-auto px-6 py-5 space-y-4">
                        {errors._ && (
                            <div className="rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-300">{errors._.join(' ')}</div>
                        )}

                        <Field label="Nama Gudang" error={errors.nama_gudang?.[0]}>
                            <Input ref={firstRef} type="text" value={form.nama_gudang} onChange={set('nama_gudang')}
                                error={errors.nama_gudang?.[0]} />
                        </Field>

                        <Field label="Nama PIC" error={errors.nama_pic?.[0]}>
                            <Input type="text" value={form.nama_pic} onChange={set('nama_pic')}
                                error={errors.nama_pic?.[0]} />
                        </Field>

                        <Field label="No. Telp" error={errors.no_telp?.[0]}>
                            <Input type="tel" value={form.no_telp} onChange={set('no_telp')}
                                error={errors.no_telp?.[0]} />
                        </Field>

                        <Field label="Propinsi" error={errors.propinsi_id?.[0]}>
                            <Select value={form.propinsi_id} onChange={setPropinsi}>
                                <option value="">-- Pilih Propinsi --</option>
                                {propinsiList.map(p => <option key={p.id} value={p.id}>{p.nama_pro}</option>)}
                            </Select>
                        </Field>

                        <Field label="Kabupaten/Kota" error={errors.kabupaten_id?.[0]}>
                            <Select value={form.kabupaten_id} onChange={setKabupaten} disabled={!form.propinsi_id}>
                                <option value="">-- Pilih Kabupaten/Kota --</option>
                                {kabupatenList.map(k => <option key={k.id} value={k.id}>{k.nama_kab}</option>)}
                            </Select>
                        </Field>

                        <Field label="Kecamatan" error={errors.kecamatan_id?.[0]}>
                            <Select value={form.kecamatan_id} onChange={set('kecamatan_id')} disabled={!form.kabupaten_id}>
                                <option value="">-- Pilih Kecamatan --</option>
                                {kecamatanList.map(k => <option key={k.id} value={k.id}>{k.nama_kec}</option>)}
                            </Select>
                        </Field>

                        <Field label="Kelurahan" error={errors.kelurahan?.[0]}>
                            <Input type="text" value={form.kelurahan} onChange={set('kelurahan')}
                                error={errors.kelurahan?.[0]} />
                        </Field>

                        <Field label="Kode Pos" error={errors.kode_pos?.[0]}>
                            <Input type="text" value={form.kode_pos} onChange={set('kode_pos')}
                                error={errors.kode_pos?.[0]} />
                        </Field>

                        {errors.alamat_gudang && <p className="text-xs text-red-400">{errors.alamat_gudang[0]}</p>}
                        <AddressMapField
                            active={open}
                            resetSignal={editTarget?.id ?? 'new'}
                            alamat={form.alamat_gudang}
                            onAlamatChange={v => setForm(f => ({ ...f, alamat_gudang: v }))}
                            kelurahan={form.kelurahan}
                            kecamatanNama={kecamatanNama}
                            kabupatenNama={kabupatenNama}
                            propinsiNama={propinsiNama}
                            kodePos={form.kode_pos}
                            latitude={form.latitude}
                            longitude={form.longitude}
                            onLocationChange={(lat, lng) => setForm(f => ({ ...f, latitude: lat, longitude: lng }))}
                        />
                    </div>

                    <div className="flex justify-end gap-3 border-t border-white/8 px-6 py-4">
                        <button type="button" onClick={onClose}
                            className="rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-400 hover:text-white transition">
                            Batal
                        </button>
                        <button type="submit" disabled={saving}
                            className="rounded-xl bg-teal-500 px-5 py-2 text-sm font-semibold text-white hover:bg-teal-400 disabled:opacity-50 transition">
                            {saving ? 'Menyimpan…' : isEdit ? 'Simpan Perubahan' : 'Ajukan Gudang'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
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
                        <DetailRow label="Propinsi" value={target.propinsi?.nama_pro} />
                        <DetailRow label="Kabupaten/Kota" value={target.kabupaten?.nama_kab} />
                        <DetailRow label="Kecamatan" value={target.kecamatan?.nama_kec} />
                        <DetailRow label="Kelurahan" value={target.kelurahan} />
                        <DetailRow label="Kode Pos" value={target.kode_pos} />
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

export default function GudangSubmissionList({ user }) {
    const [data,    setData]    = useState([]);
    const [wilayah, setWilayah] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error,   setError]   = useState(null);
    const [modalOpen,  setModalOpen]  = useState(false);
    const [editTarget, setEditTarget] = useState(null);
    const [detailTarget, setDetailTarget] = useState(null);

    const fetchData = useCallback(() => {
        setLoading(true);
        api.get('/gudang-submissions')
            .then(setData)
            .catch(e => setError(e.message))
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => {
        fetchData();
        api.get('/gudang-submissions/wilayah').then(setWilayah).catch(() => {});
    }, [fetchData]);

    async function handleDelete(g) {
        if (!confirm(`Hapus ajuan gudang "${g.nama_gudang}"?`)) return;
        try {
            await api.del(`/gudang-submissions/${g.id}`);
            fetchData();
        } catch (err) {
            alert(err.message || 'Gagal menghapus.');
        }
    }

    const columns = [
        { key: 'nama_gudang',   label: 'Nama Gudang' },
        { key: 'nama_pic',      label: 'PIC' },
        { key: 'no_telp',       label: 'No. Telp', render: r => r.no_telp || '—' },
        { key: 'kabupaten',     label: 'Kabupaten/Kota', render: r => r.kabupaten?.nama_kab || '—' },
        { key: 'kecamatan',     label: 'Kecamatan',      render: r => r.kecamatan?.nama_kec || '—' },
        { key: 'kelurahan',     label: 'Kelurahan',      render: r => r.kelurahan || '—' },
        { key: 'alamat_gudang', label: 'Alamat', render: r => r.alamat_gudang || '—' },
        { key: 'status',        label: 'Status', render: r => <StatusChip value={r.status} /> },
        {
            key: '_actions', label: '',
            render: (r) => (
                <div className="flex items-center gap-2 justify-end">
                    <button onClick={() => setDetailTarget(r)}
                        className="rounded-lg p-1.5 text-slate-500 hover:text-teal-400 hover:bg-teal-400/10 transition" title="Detail">
                        <Eye size={15} />
                    </button>
                    {['pending', 'rejected'].includes(r.status) && (
                        <>
                            <button onClick={() => { setEditTarget(r); setModalOpen(true); }}
                                className="rounded-lg p-1.5 text-slate-500 hover:text-sky-400 hover:bg-sky-400/10 transition" title="Edit">
                                <Pencil size={15} />
                            </button>
                            <button onClick={() => handleDelete(r)}
                                className="rounded-lg p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-400/10 transition" title="Hapus">
                                <Trash2 size={15} />
                            </button>
                        </>
                    )}
                </div>
            ),
        },
    ];

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-semibold text-white">Daftar Gudang</h1>
                    <p className="mt-1 text-sm text-slate-500">
                        Ajuan gudang region {user?.region}. Menunggu persetujuan SuperAdmin sebelum aktif.
                    </p>
                </div>
                <button onClick={() => { setEditTarget(null); setModalOpen(true); }}
                    className="flex items-center gap-2 rounded-xl bg-teal-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-400 transition">
                    <Plus size={16} />
                    Ajukan Gudang
                </button>
            </div>

            {error && (
                <div className="rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-300">{error}</div>
            )}

            <Table columns={columns} data={data} loading={loading} emptyMessage="Belum ada ajuan gudang." />

            <GudangModal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                onSaved={fetchData}
                editTarget={editTarget}
                wilayah={wilayah}
            />

            <GudangDetailModal
                open={Boolean(detailTarget)}
                onClose={() => setDetailTarget(null)}
                target={detailTarget}
            />
        </div>
    );
}
