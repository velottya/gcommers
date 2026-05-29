import React from 'react';

export default function StatCard({ label, value, icon: Icon, accent = 'text-amber-300', loading }) {
    return (
        <div className="rounded-2xl border border-white/10 bg-slate-950/55 p-5">
            <div className="flex items-start justify-between gap-3">
                <p className="text-xs uppercase tracking-[0.24em] text-slate-500">{label}</p>
                {Icon && <Icon size={18} strokeWidth={1.5} className="text-slate-600 shrink-0" />}
            </div>
            {loading ? (
                <div className="mt-3 h-8 w-24 animate-pulse rounded-lg bg-white/8" />
            ) : (
                <p className={`mt-3 text-3xl font-semibold ${accent}`}>{value ?? '—'}</p>
            )}
        </div>
    );
}
