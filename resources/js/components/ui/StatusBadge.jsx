import React from 'react';

const STATUS_MAP = {
    pending:        'border-yellow-400/25 bg-yellow-400/10 text-yellow-300',
    processing:     'border-blue-400/25 bg-blue-400/10 text-blue-300',
    on_delivery:    'border-sky-400/25 bg-sky-400/10 text-sky-300',
    shipped:        'border-sky-400/25 bg-sky-400/10 text-sky-300',
    delivered:      'border-emerald-400/25 bg-emerald-400/10 text-emerald-300',
    completed:      'border-emerald-400/25 bg-emerald-400/10 text-emerald-300',
    cancelled:      'border-red-400/25 bg-red-400/10 text-red-300',
    active:         'border-emerald-400/25 bg-emerald-400/10 text-emerald-300',
    inactive:       'border-slate-500/25 bg-slate-500/10 text-slate-400',
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
