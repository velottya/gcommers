import { PackagePlus, X } from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';
import { api } from '../../api/client';
import { Pagination, Table } from '../ui/Table';

function formatDate(val) {
    if (!val) return '—';
    return new Date(val).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
}

function formatRupiah(val) {
    if (val == null || val === '' || isNaN(Number(val))) return '—';
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(val));
}

const STATUS_CFG = {
    submitted: { label: 'Menunggu',  color: 'text-amber-300 bg-amber-400/10 border-amber-400/20' },
    approved:  { label: 'Disetujui', color: 'text-emerald-300 bg-emerald-400/10 border-emerald-400/20' },
    rejected:  { label: 'Ditolak',   color: 'text-red-300 bg-red-400/10 border-red-400/20' },
};

function StatusChip({ value }) {
    const cfg = STATUS_CFG[value] ?? STATUS_CFG.submitted;
    return <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${cfg.color}`}>{cfg.label}</span>;
}

// ─── Helper hitung biaya ──────────────────────────────────────────────────────
// harga_satuan   : Rp/TON
// qty            : jumlah TON
// biaya_kirim_kg : Rp/kg → total kirim = qty × 1000 kg/TON × tarif
// pph            : persentase PPH dari subtotal

function hitungBiaya({ harga_satuan, qty, biaya_pengiriman_per_kg, pajak_pph_persen }) {
    const h      = Number(harga_satuan)          || 0;
    const q      = Number(qty)                   || 0;
    const bkKg   = Number(biaya_pengiriman_per_kg) || 0;
    const pph    = Number(pajak_pph_persen)       || 0;

    const subtotal   = h * q;
    const totalKirim = bkKg * q * 1000;          // Rp/kg × TON × 1000 kg/TON
    const pphAmount  = subtotal * (pph / 100);
    const total      = subtotal + totalKirim + pphAmount;

    return { subtotal, totalKirim, pphAmount, total };
}

// ─── Modal Buat Ajuan Stok ────────────────────────────────────────────────────

function BuatAjuanModal({ onClose, onSubmitted }) {
    const [products,  setProducts]  = useState([]);
    const [pphDefault,setPphDefault]= useState(0.25);
    const [loading,   setLoading]   = useState(true);

    const [selectedId,    setSelectedId]    = useState('');
    const [regionInfo,    setRegionInfo]    = useState(null);
    const [qty,           setQty]           = useState('');
    const [hargaSatuan,   setHargaSatuan]   = useState('');
    const [biayaKirimKg,  setBiayaKirimKg]  = useState('');
    const [pajakPph,      setPajakPph]      = useState('');
    const [notes,         setNotes]         = useState('');

    const [saving, setSaving] = useState(false);
    const [error,  setError]  = useState(null);

    // Fetch produk & default PPH
    useEffect(() => {
        Promise.all([
            api.get('/products', { status: 'Aktif', per_page: 500 }),
            api.get('/settings/fees-view'),
        ]).then(([prodRes, feeRes]) => {
            setProducts(prodRes.data ?? []);
            const feeMap = Object.fromEntries((feeRes ?? []).map(f => [f.key, f.value]));
            const pph = parseFloat(feeMap['pph_persen'] ?? 0.25);
            setPphDefault(pph);
            setPajakPph(String(pph));
        }).catch(() => {
            setPajakPph('0.25');
        }).finally(() => setLoading(false));
    }, []);

    // Saat produk dipilih, load harga + ongkir + stok region sebelumnya
    useEffect(() => {
        if (!selectedId) { setRegionInfo(null); return; }
        api.get(`/product-stock-requests/price/${selectedId}`)
            .then(price => {
                setRegionInfo(price);
                if (price.harga_satuan > 0)            setHargaSatuan(String(price.harga_satuan));
                if (price.biaya_pengiriman_per_kg > 0) setBiayaKirimKg(String(price.biaya_pengiriman_per_kg));
                setPajakPph(String(price.pajak_pph_persen));
            })
            .catch(() => setRegionInfo(null));
    }, [selectedId]);

    const { subtotal, totalKirim, pphAmount, total } = hitungBiaya({
        harga_satuan:          hargaSatuan,
        qty,
        biaya_pengiriman_per_kg: biayaKirimKg,
        pajak_pph_persen:      pajakPph,
    });
    const hasBreakdown = Number(hargaSatuan) > 0 && Number(qty) > 0;

    async function handleSubmit(e) {
        e.preventDefault();
        if (!selectedId)                              { setError('Pilih produk terlebih dahulu.'); return; }
        if (!qty || Number(qty) <= 0)                 { setError('Jumlah stok harus lebih dari 0.'); return; }
        if (!hargaSatuan || Number(hargaSatuan) <= 0) { setError('Harga satuan harus diisi.'); return; }
        if (biayaKirimKg === '')                      { setError('Biaya pengiriman harus diisi (boleh 0).'); return; }

        setSaving(true);
        setError(null);
        try {
            await api.post('/product-stock-requests', {
                product_id:             Number(selectedId),
                qty_requested:          Number(qty),
                harga_satuan:           Number(hargaSatuan),
                biaya_pengiriman_per_kg: Number(biayaKirimKg),
                pajak_pph_persen:       Number(pajakPph),
                notes:                  notes || null,
            });
            onSubmitted();
        } catch (err) {
            setError(err.message || 'Gagal mengajukan.');
        } finally {
            setSaving(false);
        }
    }

    const inputCls = 'w-full rounded-xl border border-white/10 bg-slate-950/50 px-3 py-2 text-sm text-white placeholder-slate-600 outline-none focus:border-amber-400/40 transition';
    const labelCls = 'mb-1.5 block text-xs text-slate-400';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4 py-6">
            <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl">

                <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-2">
                        <PackagePlus size={18} className="text-teal-300" />
                        <h2 className="text-base font-semibold text-white">Buat Ajuan Tambah Stok</h2>
                    </div>
                    <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:text-white hover:bg-white/8 transition">
                        <X size={18} />
                    </button>
                </div>

                {error && (
                    <div className="mb-4 rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-300">{error}</div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">

                    {/* Pilih Produk */}
                    <div>
                        <label className={labelCls}>Pilih Produk <span className="text-red-400">*</span></label>
                        {loading ? (
                            <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-slate-950/50 px-3 py-2 text-sm text-slate-500">
                                <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-600 border-t-amber-400" />
                                Memuat…
                            </div>
                        ) : (
                            <select
                                value={selectedId}
                                onChange={e => { setSelectedId(e.target.value); setError(null); }}
                                className={`${inputCls} appearance-none`}
                            >
                                <option value="">— Pilih produk —</option>
                                {products.map(p => (
                                    <option key={p.id} value={p.id}>
                                        {p.kodeProduk} — {p.namaProduk}
                                    </option>
                                ))}
                            </select>
                        )}

                        {/* Stok region saat ini */}
                        {regionInfo != null && (
                            <div className="mt-2 flex items-center justify-between rounded-xl border border-white/6 bg-white/3 px-4 py-2.5 text-xs">
                                <span className="text-slate-500">Stok region saat ini</span>
                                <span className={`font-semibold ${Number(regionInfo.qty_available) <= 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                                    {Number(regionInfo.qty_available).toLocaleString('id-ID')} TON
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Jumlah Stok */}
                    <div>
                        <label className={labelCls}>Jumlah Stok yang Diajukan <span className="text-red-400">*</span></label>
                        <div className="flex items-center gap-2">
                            <input type="number" min="1" value={qty} onChange={e => setQty(e.target.value)}
                                placeholder="mis. 10" className={`${inputCls} flex-1`} />
                            <span className="shrink-0 rounded-xl border border-white/10 bg-slate-800 px-3 py-2 text-sm font-medium text-slate-400">TON</span>
                        </div>
                    </div>

                    {/* Informasi Harga */}
                    <div className="border-t border-white/8 pt-1">
                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-4">Informasi Harga</p>

                        <div className="space-y-4">
                            <div>
                                <label className={labelCls}>Harga Satuan <span className="text-red-400">*</span></label>
                                <div className="flex items-center gap-2">
                                    <input type="number" min="0" step="1000"
                                        value={hargaSatuan} onChange={e => setHargaSatuan(e.target.value)}
                                        placeholder="mis. 2250000" className={`${inputCls} flex-1`} />
                                    <span className="shrink-0 rounded-xl border border-white/10 bg-slate-800 px-3 py-2 text-sm font-medium text-slate-400">Rp/TON</span>
                                </div>
                            </div>

                            <div>
                                <label className={labelCls}>Biaya Pengiriman <span className="text-red-400">*</span></label>
                                <div className="flex items-center gap-2">
                                    <input type="number" min="0" step="1"
                                        value={biayaKirimKg} onChange={e => setBiayaKirimKg(e.target.value)}
                                        placeholder="mis. 50" className={`${inputCls} flex-1`} />
                                    <span className="shrink-0 rounded-xl border border-white/10 bg-slate-800 px-3 py-2 text-sm font-medium text-slate-400">Rp/kg</span>
                                </div>
                                {Number(biayaKirimKg) > 0 && Number(qty) > 0 && (
                                    <p className="mt-1 text-xs text-slate-500">
                                        = {(Number(qty) * 1000).toLocaleString('id-ID')} kg × {formatRupiah(biayaKirimKg)}/kg = {formatRupiah(Number(biayaKirimKg) * Number(qty) * 1000)}
                                    </p>
                                )}
                            </div>

                            <div>
                                <label className={labelCls}>Tarif PPH (%)</label>
                                <input type="number" min="0" max="100" step="0.01"
                                    value={pajakPph} onChange={e => setPajakPph(e.target.value)}
                                    className={inputCls} />
                                <p className="mt-1 text-xs text-slate-600">Default sistem: {pphDefault}%</p>
                            </div>
                        </div>
                    </div>

                    {/* Estimasi Biaya */}
                    {hasBreakdown && (
                        <div className="rounded-xl border border-amber-400/15 bg-amber-400/5 px-4 py-3 space-y-1.5">
                            <p className="text-xs font-semibold text-amber-300 mb-2">Estimasi Total Biaya</p>
                            <div className="space-y-1 text-xs text-slate-400">
                                <div className="flex justify-between">
                                    <span>Subtotal ({qty} TON × {formatRupiah(hargaSatuan)}/TON)</span>
                                    <span className="text-white">{formatRupiah(subtotal)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Ongkir ({qty} TON = {(Number(qty)*1000).toLocaleString('id-ID')} kg × {formatRupiah(biayaKirimKg)}/kg)</span>
                                    <span>{formatRupiah(totalKirim)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>PPH ({pajakPph}%)</span>
                                    <span>{formatRupiah(pphAmount)}</span>
                                </div>
                                <div className="flex justify-between border-t border-white/10 pt-1.5 mt-1 font-semibold text-amber-300">
                                    <span>Total Estimasi</span>
                                    <span>{formatRupiah(total)}</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Keterangan */}
                    <div>
                        <label className={labelCls}>Keterangan <span className="text-slate-600">(opsional)</span></label>
                        <textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)}
                            placeholder="Alasan pengajuan, kondisi lapangan, dll."
                            className={`${inputCls} resize-none`} />
                    </div>

                    <div className="flex justify-end gap-3 pt-1">
                        <button type="button" onClick={onClose}
                            className="rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-400 hover:text-white hover:bg-white/6 transition">
                            Batal
                        </button>
                        <button
                            type="submit"
                            disabled={saving || !selectedId || loading}
                            className="flex items-center gap-2 rounded-xl bg-teal-500 px-5 py-2 text-sm font-semibold text-white hover:bg-teal-400 disabled:opacity-50 transition"
                        >
                            <PackagePlus size={15} />
                            {saving ? 'Mengirim…' : 'Kirim Ajuan'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ─── Halaman Utama ────────────────────────────────────────────────────────────

export default function AjuanStok() {
    const [data,      setData]      = useState(null);
    const [loading,   setLoading]   = useState(true);
    const [error,     setError]     = useState(null);
    const [page,      setPage]      = useState(1);
    const [status,    setStatus]    = useState('');
    const [showModal, setShowModal] = useState(false);

    const fetchData = useCallback(() => {
        setLoading(true);
        api.get('/product-stock-requests', { page, ...(status ? { status } : {}) })
            .then(setData)
            .catch(e => setError(e.message))
            .finally(() => setLoading(false));
    }, [page, status]);

    useEffect(() => { fetchData(); }, [fetchData]);

    function handleSubmitted() {
        setShowModal(false);
        fetchData();
    }

    const columns = [
        {
            key: 'product_name',
            label: 'Produk',
            render: r => (
                <div>
                    <p className="font-medium text-white">{r.product_name}</p>
                    {r.product_code && <p className="text-xs text-slate-500 font-mono">{r.product_code}</p>}
                </div>
            ),
        },
        { key: 'qty_requested',          label: 'Qty (TON)',     render: r => <span className="font-semibold text-amber-300">+{r.qty_requested}</span> },
        { key: 'harga_satuan',           label: 'Harga/TON',     render: r => r.harga_satuan           ? formatRupiah(r.harga_satuan)                    : <span className="text-slate-600 text-xs">—</span> },
        { key: 'biaya_pengiriman_per_kg',label: 'Ongkir/kg',     render: r => r.biaya_pengiriman_per_kg ? <span>{formatRupiah(r.biaya_pengiriman_per_kg)}/kg</span> : <span className="text-slate-600 text-xs">—</span> },
        { key: 'status',                 label: 'Status',        render: r => <StatusChip value={r.status} /> },
        { key: 'reviewed_by',            label: 'Ditinjau',      render: r => r.reviewed_by  ? <span className="text-xs text-slate-400">{r.reviewed_by}</span>  : null },
        { key: 'review_note',            label: 'Catatan',       render: r => r.review_note  ? <span className="text-xs text-slate-400">{r.review_note}</span>   : null },
        { key: 'created_at',             label: 'Tgl Ajuan',     render: r => <span className="text-xs text-slate-400">{formatDate(r.created_at)}</span> },
    ];

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-400/10">
                        <PackagePlus size={20} className="text-teal-300" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-semibold text-white">Riwayat Ajuan Stok</h1>
                        <p className="text-sm text-slate-500">Ajuan penambahan stok yang telah dikirim ke SuperAdmin.</p>
                    </div>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="flex items-center gap-2 rounded-xl bg-teal-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-400 transition"
                >
                    <PackagePlus size={16} />
                    Buat Ajuan Stok
                </button>
            </div>

            <div className="flex items-center gap-3">
                <select
                    value={status}
                    onChange={e => { setStatus(e.target.value); setPage(1); }}
                    className="rounded-xl border border-white/10 bg-slate-950/50 px-3 py-2 text-sm text-slate-300 outline-none focus:border-amber-400/30 transition"
                >
                    <option value="">Semua Status</option>
                    <option value="submitted">Menunggu Persetujuan</option>
                    <option value="approved">Disetujui</option>
                    <option value="rejected">Ditolak</option>
                </select>
            </div>

            {error && (
                <div className="rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-300">{error}</div>
            )}

            <Table columns={columns} data={data?.data} loading={loading} emptyMessage="Belum ada ajuan stok." />
            <Pagination meta={data} onPageChange={setPage} />

            {showModal && (
                <BuatAjuanModal
                    onClose={() => setShowModal(false)}
                    onSubmitted={handleSubmitted}
                />
            )}
        </div>
    );
}
