import { ArrowLeft, Box, CalendarDays, Layers3, Package, Scale, Star } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../../api/client';
import StatusBadge from '../ui/StatusBadge';

function formatRupiah(val) {
    if (val == null) return '—';
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);
}

function formatDate(val) {
    if (!val) return '—';
    return new Date(val).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
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
    const [error, setError] = useState(null);

    useEffect(() => {
        api.get(`/products/${id}`)
            .then(setProduct)
            .catch(e => setError(e.message))
            .finally(() => setLoading(false));
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
                    <p className="mt-1 text-sm text-slate-400">{product?.productCode}</p>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <InfoCard icon={Package} label="Nama" value={product?.name} />
                <InfoCard icon={Scale} label="Kategori" value={product?.category} />
                <InfoCard icon={Box} label="Stok" value={product?.stock ?? '—'} />
                <InfoCard icon={Star} label="Rating" value={product?.rating ? Number(product.rating).toFixed(1) : '—'} />
            </div>

            <div className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
                <div className="space-y-6">
                    <section className="rounded-2xl border border-white/8 bg-slate-950/55 p-6">
                        <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Informasi Utama</h2>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <InfoCard icon={Layers3} label="Kode Produk" value={product?.productCode} />
                            <InfoCard icon={Package} label="Satuan" value={product?.unit} />
                            <InfoCard icon={Box} label="Minimum Order" value={product?.minimumOrder} />
                            <InfoCard icon={CalendarDays} label="Diperbarui" value={formatDate(product?.updatedAt)} />
                        </div>
                    </section>

                    <section className="rounded-2xl border border-white/8 bg-slate-950/55 p-6">
                        <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Deskripsi</h2>
                        <p className="whitespace-pre-line leading-7 text-slate-300">
                            {product?.description || '—'}
                        </p>
                    </section>

                    <section className="rounded-2xl border border-white/8 bg-slate-950/55 p-6">
                        <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Spesifikasi</h2>
                        <p className="whitespace-pre-line leading-7 text-slate-300">
                            {product?.specification || '—'}
                        </p>
                    </section>
                </div>

                <aside className="space-y-6">
                    <section className="rounded-2xl border border-white/8 bg-slate-950/55 p-6">
                        <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Ringkasan Harga</h2>
                        <div className="space-y-3 text-sm text-slate-300">
                            <div className="flex items-center justify-between gap-4">
                                <span>Harga</span>
                                <span className="font-semibold text-white">{formatRupiah(product?.price)}</span>
                            </div>
                            <div className="flex items-center justify-between gap-4">
                                <span>Status</span>
                                <span className="font-semibold text-white">{product?.status || '—'}</span>
                            </div>
                            <div className="flex items-center justify-between gap-4">
                                <span>Source Product ID</span>
                                <span className="font-semibold text-white">{product?.sourceProductId ?? '—'}</span>
                            </div>
                            <div className="flex items-center justify-between gap-4">
                                <span>Icon</span>
                                <span className="font-semibold text-white">{product?.iconName || '—'}</span>
                            </div>
                        </div>
                    </section>

                    <section className="rounded-2xl border border-white/8 bg-slate-950/55 p-6">
                        <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Waktu</h2>
                        <div className="space-y-3 text-sm text-slate-300">
                            <div className="flex items-center justify-between gap-4">
                                <span>Dibuat</span>
                                <span className="font-semibold text-white">{formatDate(product?.createdAt)}</span>
                            </div>
                            <div className="flex items-center justify-between gap-4">
                                <span>Diperbarui</span>
                                <span className="font-semibold text-white">{formatDate(product?.updatedAt)}</span>
                            </div>
                        </div>
                    </section>
                </aside>
            </div>
        </div>
    );
}