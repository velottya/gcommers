import { Search } from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';
import { api } from '../../api/client';
import StatusBadge from '../ui/StatusBadge';
import { Pagination, Table } from '../ui/Table';

function formatDate(val) {
    if (!val) return '—';
    return new Date(val).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

function userField(user, camelKey, pascalKey) {
    return user?.[camelKey] ?? user?.[pascalKey] ?? null;
}

const COLUMNS = [
    { key: 'DisplayName',     label: 'Nama',        render: r => userField(r, 'DisplayName', 'DisplayName') },
    { key: 'Email',           label: 'Email',       render: r => userField(r, 'Email', 'Email') },
    { key: 'Role',            label: 'Role',        render: r => <StatusBadge value={userField(r, 'Role', 'Role')} /> },
    { key: 'CompanyName',     label: 'Perusahaan',  render: r => userField(r, 'CompanyName', 'CompanyName') },
    { key: 'TransportirName', label: 'Transportir', render: r => userField(r, 'TransportirName', 'TransportirName') },
    { key: 'Phone',           label: 'Telepon',     render: r => userField(r, 'Phone', 'Phone') },
    { key: 'CreatedAt',       label: 'Bergabung',   render: r => formatDate(userField(r, 'CreatedAt', 'CreatedAt')) },
];

export default function AdminTransportList() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [query, setQuery] = useState('');

    const fetchUsers = useCallback(() => {
        setLoading(true);
        api.get('/users', { page, role: 'AdminTransport', search: query })
            .then(setData)
            .catch(e => setError(e.message))
            .finally(() => setLoading(false));
    }, [page, query]);

    useEffect(() => { fetchUsers(); }, [fetchUsers]);

    function handleSearch(e) {
        e.preventDefault();
        setPage(1);
        setQuery(search);
    }

    return (
        <div className="mx-auto w-full max-w-7xl space-y-6">
            <div>
                <h1 className="text-2xl font-semibold text-white">Daftar Admin Transport</h1>
                <p className="mt-1 text-sm text-slate-500">Daftar akun admin transport bersifat read-only.</p>
            </div>

            <form onSubmit={handleSearch} className="flex flex-wrap gap-3">
                <div className="relative flex-1 min-w-[200px]">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                        type="text"
                        placeholder="Cari nama atau email…"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full rounded-xl border border-white/10 bg-slate-950/50 pl-9 pr-4 py-2.5 text-sm text-white placeholder-slate-600 outline-none focus:border-amber-400/30 transition"
                    />
                </div>
                <button
                    type="submit"
                    className="rounded-xl bg-amber-400 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-amber-300 transition"
                >
                    Cari
                </button>
            </form>

            {error && (
                <div className="rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-300">
                    {error}
                </div>
            )}

            <Table
                columns={COLUMNS}
                data={data?.data}
                loading={loading}
                emptyMessage="Tidak ada admin transport ditemukan."
            />

            <Pagination meta={data} onPageChange={setPage} />
        </div>
    );
}
