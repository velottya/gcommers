import { ArrowLeft, CalendarDays, FileText, Layers3, MapPin, Package, Scale } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../../api/client';
import StatusBadge from '../ui/StatusBadge';
import { Table } from '../ui/Table';

function formatDate(val) {
    if (!val) return '—';
    return new Date(val).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
}

function formatRupiah(val) {
    if (val == null) return '—';
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);
}

function fTon(val) {
    return val == null ? '—' : `${Number(val).toLocaleString('id-ID', { maximumFractionDigits: 2 })} TON`;
}

function InfoCard({ icon: Icon, label, value }) {
    return (
        <div className="rounded-2xl border border-white/8 bg-slate-950/55 p-5">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <p className="text-xs uppercase tracking-[0.22em] text-slate-500">{label}</p>
                    <div className="mt-2 text-lg font-semibold text-white">{value ?? '—'}</div>
                </div>
                <Icon size={18} className="text-slate-500" />
            </div>
        </div>
    );
}

export default function ProductDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error,   setError]   = useState(null);

    const [kecamatanStatus,    setKecamatanStatus]    = useState([]);
    const [kecamatanLoading,   setKecamatanLoading]   = useState(true);
    const [kecamatanError,     setKecamatanError]     = useState(null);

    useEffect(() => {
        api.get(`/products/${id}`)
            .then(setProduct)
            .catch(e => setError(e.message))
            .finally(() => setLoading(false));
    }, [id]);

    useEffect(() => {
        setKecamatanLoading(true);
        api.get(`/products/${id}/kecamatan-status`)
            .then(setKecamatanStatus)
            .catch(e => setKecamatanError(e.message))
            .finally(() => setKecamatanLoading(false));
    }, [id]);

    if (loading) {
        return (
            <div className="space-y-4">
                <div className="h-8 w-48 animate-pulse rounded-lg bg-white/5" />
                <div className="h-40 animate-pulse rounded-2xl bg-white/5" />
                <div className="h-64 animate-pulse rounded-2xl bg-white/5" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-300">
                Gagal memuat detail produk: {error}
            </div>
        );
    }

    const kecamatanColumns = [
        { key: 'kecamatan',         label: 'Kecamatan',          render: r => <span className="font-medium text-white">{r.kecamatan}</span> },
        { key: 'region',           label: 'Region',             render: r => r.region || '—' },
        { key: 'harga_satuan',     label: 'Harga Satuan/kg',    render: r => formatRupiah(r.harga_satuan) },
        { key: 'period',           label: 'Periode Kuota',      render: r => r.period || '—' },
        { key: 'quota_ton',        label: 'Kuota',              render: r => fTon(r.quota_ton) },
        { key: 'used_ton',         label: 'Terpakai',           render: r => fTon(r.used_ton) },
        {
            key: 'remaining_ton', label: 'Sisa',
            render: r => <span className="font-semibold text-emerald-300">{fTon(r.remaining_ton)}</span>,
        },
    ];

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <button
                    onClick={() => navigate(-1)}
                    className="rounded-lg border border-white/10 bg-white/5 p-2 text-slate-400 hover:text-white transition"
                >
                    <ArrowLeft size={18} />
                </button>
                <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-3">
                        <h1 className="text-2xl font-semibold text-white">Detail Produk</h1>
                        <StatusBadge value={product?.status} />
                    </div>
                    <p className="mt-1 text-sm text-slate-400 font-mono">{product?.kodeProduk}</p>
                </div>
            </div>

            {/* Kartu ringkasan utama */}
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <InfoCard icon={Package} label="Nama Produk" value={product?.namaProduk} />
                <InfoCard icon={Scale}   label="Satuan"      value={product?.satuan} />
                <InfoCard icon={Layers3} label="Jenis"       value={product?.jenis} />
                <InfoCard icon={FileText}label="Status"      value={product?.status} />
            </div>

            <div className="grid gap-6 xl:grid-cols-[1.5fr_0.5fr]">
                <div className="space-y-6">
                    {/* Informasi utama */}
                    <section className="rounded-2xl border border-white/8 bg-slate-950/55 p-6">
                        <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Informasi Produk</h2>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <InfoCard icon={Layers3}     label="Kode Produk" value={product?.kodeProduk} />
                            <InfoCard icon={Scale}       label="Satuan"      value={product?.satuan} />
                            <InfoCard icon={CalendarDays}label="Dibuat"      value={formatDate(product?.createdAt)} />
                            <InfoCard icon={CalendarDays}label="Diperbarui"  value={formatDate(product?.updatedAt)} />
                        </div>
                    </section>

                    {/* Uraian */}
                    <section className="rounded-2xl border border-white/8 bg-slate-950/55 p-6">
                        <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Uraian</h2>
                        <p className="whitespace-pre-line leading-7 text-slate-300">
                            {product?.uraian || '—'}
                        </p>
                    </section>
                </div>
            </div>

            {/* Stok & harga real-time per kecamatan */}
            <section className="rounded-2xl border border-white/8 bg-slate-950/55 p-6">
                <div className="mb-4 flex items-center gap-2">
                    <MapPin size={16} className="text-amber-400" />
                    <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
                        Stok &amp; Harga per Kecamatan
                    </h2>
                </div>
                {kecamatanError && (
                    <div className="mb-4 rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-300">
                        {kecamatanError}
                    </div>
                )}
                <Table
                    columns={kecamatanColumns}
                    data={kecamatanStatus}
                    loading={kecamatanLoading}
                    emptyMessage="Belum ada harga/kuota yang disetujui untuk produk ini di kecamatan manapun."
                />
            </section>
        </div>
    );
}
