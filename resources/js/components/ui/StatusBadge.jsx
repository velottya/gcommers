import React from 'react';

const STATUS_MAP = {
    pending_payment: 'border-yellow-400/25 bg-yellow-400/10 text-yellow-300',
    pending:        'border-yellow-400/25 bg-yellow-400/10 text-yellow-300',
    paid:           'border-blue-400/25 bg-blue-400/10 text-blue-300',
    processing:     'border-blue-400/25 bg-blue-400/10 text-blue-300',
    shipping:       'border-sky-400/25 bg-sky-400/10 text-sky-300',
    on_delivery:    'border-sky-400/25 bg-sky-400/10 text-sky-300',
    shipped:        'border-sky-400/25 bg-sky-400/10 text-sky-300',
    delivered:      'border-emerald-400/25 bg-emerald-400/10 text-emerald-300',
    completed:      'border-emerald-400/25 bg-emerald-400/10 text-emerald-300',
    cancelled:      'border-red-400/25 bg-red-400/10 text-red-300',
    active:         'border-emerald-400/25 bg-emerald-400/10 text-emerald-300',
    inactive:       'border-slate-500/25 bg-slate-500/10 text-slate-400',
    Aktif:          'border-emerald-400/25 bg-emerald-400/10 text-emerald-300',
    Nonaktif:       'border-slate-500/25 bg-slate-500/10 text-slate-400',
    SuperAdmin:     'border-amber-400/25 bg-amber-400/10 text-amber-300',
    AdminRegion:    'border-teal-400/25 bg-teal-400/10 text-teal-300',
    AdminTransport: 'border-sky-400/25 bg-sky-400/10 text-sky-300',
};

export default function StatusBadge({ value }) {
    const cls = STATUS_MAP[value] ?? 'border-white/10 bg-white/5 text-slate-400';
    return (
        <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${cls}`}>
            {value ?? '—'}
        </span>
    );
}

// ─── 2 status pembayaran: pending | paid ────────────────────────────────────
const PAYMENT_STATUS_LABEL = {
    pending: 'Pending',
    paid:    'Sudah Dibayar',
};

export function PaymentStatusBadge({ value }) {
    const cls = value === 'paid'
        ? 'border-emerald-400/25 bg-emerald-400/10 text-emerald-300'
        : 'border-yellow-400/25 bg-yellow-400/10 text-yellow-300';
    return (
        <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${cls}`}>
            {PAYMENT_STATUS_LABEL[value] ?? value ?? '—'}
        </span>
    );
}

// ─── 4 status pemesanan: processing | shipping | delivered | cancelled ──────
const ORDER_STATUS_LABEL = {
    processing: 'Sedang Diproses',
    shipping:   'Dalam Perjalanan',
    delivered:  'Pemesanan Selesai',
    cancelled:  'Dibatalkan',
};

const ORDER_STATUS_CLASS = {
    processing: 'border-amber-400/25 bg-amber-400/10 text-amber-300',
    shipping:   'border-sky-400/25 bg-sky-400/10 text-sky-300',
    delivered:  'border-emerald-400/25 bg-emerald-400/10 text-emerald-300',
    cancelled:  'border-red-400/25 bg-red-400/10 text-red-300',
};

export function OrderStatusBadge({ value }) {
    const cls = ORDER_STATUS_CLASS[value] ?? 'border-white/10 bg-white/5 text-slate-400';
    return (
        <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${cls}`}>
            {ORDER_STATUS_LABEL[value] ?? (value ? value : 'Menunggu Pembayaran')}
        </span>
    );
}

// ─── Status Pengajuan SO per pesanan: none | submitted | approved | rejected ─
const SO_STATUS_LABEL = {
    none:      'Belum Diajukan SO',
    submitted: 'SO Menunggu Peninjauan',
    approved:  'SO Disetujui',
    rejected:  'SO Ditolak',
};

const SO_STATUS_CLASS = {
    none:      'border-slate-500/25 bg-slate-500/10 text-slate-400',
    submitted: 'border-amber-400/25 bg-amber-400/10 text-amber-300',
    approved:  'border-emerald-400/25 bg-emerald-400/10 text-emerald-300',
    rejected:  'border-red-400/25 bg-red-400/10 text-red-300',
};

export function SoStatusBadge({ status }) {
    const value = status ?? 'none';
    return (
        <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${SO_STATUS_CLASS[value] ?? SO_STATUS_CLASS.none}`}>
            {SO_STATUS_LABEL[value] ?? value}
        </span>
    );
}
