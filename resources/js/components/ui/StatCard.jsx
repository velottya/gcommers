import React from 'react';

export default function StatCard({ label, value, icon: Icon, accent = 'text-amber-300', loading, compact = false, onClick }) {
    if (compact) {
        return (
            <div className={`rounded-xl border border-white/10 bg-slate-950/55 px-3 py-3 min-w-0 ${onClick ? 'cursor-pointer hover:border-white/25 hover:bg-slate-900/60 transition' : ''}`} onClick={onClick}>
                <div className="flex items-center justify-between gap-1 mb-1.5">
                    <p className="text-[10px] uppercase tracking-wider text-slate-500 leading-tight truncate">{label}</p>
                    {Icon && <Icon size={13} strokeWidth={1.5} className="text-slate-600 shrink-0" />}
                </div>
                {loading ? (
                    <div className="h-6 w-12 animate-pulse rounded-md bg-white/8" />
                ) : (
                    <p className={`text-xl font-semibold ${accent}`}>{value ?? '—'}</p>
                )}
            </div>
        );
    }

    return (
        <div className={`rounded-2xl border border-white/10 bg-slate-950/55 p-5 min-w-0 ${onClick ? 'cursor-pointer hover:border-white/25 hover:bg-slate-900/60 transition' : ''}`} onClick={onClick}>
            <div className="flex items-start justify-between gap-3">
                <p className="text-xs uppercase tracking-wider text-slate-500 leading-tight">{label}</p>
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
