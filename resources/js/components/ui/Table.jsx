import { ChevronLeft, ChevronRight } from 'lucide-react';
import React from 'react';

export function Table({ columns, data, loading, emptyMessage = 'Tidak ada data.' }) {
    if (loading) {
        return (
            <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-12 animate-pulse rounded-xl bg-white/5" />
                ))}
            </div>
        );
    }

    if (!data?.length) {
        return (
            <div className="rounded-2xl border border-white/8 bg-white/3 py-12 text-center text-sm text-slate-500">
                {emptyMessage}
            </div>
        );
    }

    return (
        <div className="overflow-x-auto rounded-2xl border border-white/8">
            <table className="w-full text-sm">
                <thead>
                    <tr className="border-b border-white/8 bg-white/4">
                        {columns.map(col => (
                            <th
                                key={col.key}
                                className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-500"
                            >
                                {col.label}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                    {data.map((row, i) => (
                        <tr key={row.id ?? i} className="hover:bg-white/3 transition">
                            {columns.map(col => (
                                <td key={col.key} className="px-4 py-3 text-slate-200">
                                    {col.render ? col.render(row) : (row[col.key] ?? '—')}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export function Pagination({ meta, onPageChange }) {
    if (!meta || meta.last_page <= 1) return null;

    return (
        <div className="mt-4 flex items-center justify-between gap-4 text-sm text-slate-400">
            <span>
                {meta.from}–{meta.to} dari {meta.total}
            </span>
            <div className="flex gap-2">
                <button
                    disabled={meta.current_page <= 1}
                    onClick={() => onPageChange(meta.current_page - 1)}
                    className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition"
                >
                    <ChevronLeft size={16} />
                </button>
                <span className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-white">
                    {meta.current_page} / {meta.last_page}
                </span>
                <button
                    disabled={meta.current_page >= meta.last_page}
                    onClick={() => onPageChange(meta.current_page + 1)}
                    className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition"
                >
                    <ChevronRight size={16} />
                </button>
            </div>
        </div>
    );
}
