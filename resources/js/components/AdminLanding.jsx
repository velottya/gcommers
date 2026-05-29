import React from 'react';

const roles = [
    {
        name: 'SuperAdmin',
        subtitle: 'Kantor pusat',
        tone: 'from-amber-400/25 to-orange-500/10',
        border: 'border-amber-400/25',
        badge: 'Global control',
        items: ['Semua region', 'Semua admin', 'Audit & settings'],
    },
    {
        name: 'AdminRegion',
        subtitle: 'Kantor region',
        tone: 'from-teal-400/25 to-cyan-500/10',
        border: 'border-teal-400/25',
        badge: 'Regional scope',
        items: ['Order region', 'Produk region', 'Admin region'],
    },
    {
        name: 'AdminTransport',
        subtitle: 'Manager mitra transportir',
        tone: 'from-sky-400/25 to-blue-500/10',
        border: 'border-sky-400/25',
        badge: 'Delivery ops',
        items: ['Order siap kirim', 'Riwayat event', 'Profil transportir'],
    },
];

const tableMap = [
    { table: 'Users', desc: 'Akun admin dan profil peran', note: 'Role, Region, CompanyName, TransportirName' },
    { table: 'Products', desc: 'Master produk', note: 'Bisa dibaca semua role, tanpa ubah schema' },
    { table: 'Orders', desc: 'Header transaksi', note: 'Filter global, region, atau delivery' },
    { table: 'OrderItems', desc: 'Detail item order', note: 'Dipakai di halaman detail order' },
    { table: 'OrderEvents', desc: 'Progress proses order', note: 'Paling penting untuk transport' },
    { table: 'Notifications', desc: 'Pusat notifikasi', note: 'Personal, role-based, atau region-based' },
];

const metrics = [
    { value: '3', label: 'Role admin', accent: 'text-amber-300' },
    { value: '6', label: 'Tabel existing', accent: 'text-teal-300' },
    { value: '0', label: 'Schema change', accent: 'text-sky-300' },
];

const roleProfiles = {
    SuperAdmin: {
        label: 'Global control',
        title: 'Dashboard SuperAdmin',
        description: 'Kontrol lintas region dengan akses penuh ke monitoring, audit, dan pengaturan sistem.',
        accent: 'from-amber-400/25 to-orange-500/10',
    },
    AdminRegion: {
        label: 'Regional scope',
        title: 'Dashboard AdminRegion',
        description: 'Fokus ke region masing-masing untuk order, user regional, dan monitoring produk.',
        accent: 'from-teal-400/25 to-cyan-500/10',
    },
    AdminTransport: {
        label: 'Delivery ops',
        title: 'Dashboard AdminTransport',
        description: 'Operasional pengiriman, event order, dan profil transportir dalam satu layar.',
        accent: 'from-sky-400/25 to-blue-500/10',
    },
};

export default function AdminLanding({ adminRole = null, pageContext = 'landing' }) {
    const activeRole = adminRole && roleProfiles[adminRole] ? roleProfiles[adminRole] : null;

    return (
        <main className="min-h-screen text-slate-100">
            <section className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-6 sm:px-6 lg:px-8">
                <header className="fade-up flex flex-wrap items-center justify-between gap-4 rounded-full border border-white/10 bg-white/6 px-4 py-3 shadow-2xl shadow-black/20 backdrop-blur-xl">
                    <div>
                        <p className="text-xs uppercase tracking-[0.32em] text-slate-400">Gcommers Admin Console</p>
                        <h1 className="mt-1 text-lg font-semibold text-white">{activeRole ? activeRole.title : 'Role-based admin portal'}</h1>
                    </div>
                </header>

                <div className="grid flex-1 gap-6 py-6 lg:grid-cols-[1.15fr_0.85fr] lg:py-8">
                    <section className="fade-up fade-up-delay-1 rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.09),rgba(255,255,255,0.03))] p-6 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.75)] backdrop-blur-xl sm:p-8">
                        <div className="max-w-3xl">
                            <div className={`inline-flex items-center gap-2 rounded-full border border-white/10 bg-gradient-to-r ${activeRole?.accent ?? 'from-amber-300/10 to-sky-300/10'} px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-amber-200`}>
                                {pageContext === 'dashboard' && activeRole ? activeRole.title : 'Admin dashboard blueprint'}
                            </div>
                            <h2 className="mt-5 text-4xl font-semibold tracking-tight text-white sm:text-5xl">{activeRole ? activeRole.description : 'Satu database, tiga peran, tanpa mengganggu tampilan user.'}</h2>
                            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
                                Antarmuka ini dirancang untuk membaca tabel yang sudah ada, lalu membagi pengalaman kerja berdasarkan hak akses SuperAdmin, AdminRegion, dan AdminTransport.
                            </p>
                        </div>

                        <div className="mt-8 grid gap-4 sm:grid-cols-3">
                            {metrics.map((metric) => (
                                <div key={metric.label} className="floaty rounded-3xl border border-white/10 bg-slate-950/45 p-4">
                                    <div className={`text-3xl font-semibold ${metric.accent}`}>{metric.value}</div>
                                    <div className="mt-2 text-sm text-slate-400">{metric.label}</div>
                                </div>
                            ))}
                        </div>

                        <div className="mt-8 grid gap-4 xl:grid-cols-3">
                            {roles.map((role, index) => (
                                <article
                                    key={role.name}
                                    className={`fade-up fade-up-delay-${Math.min(index + 1, 3)} rounded-[1.75rem] border ${role.border} bg-gradient-to-br ${role.tone} p-5`}
                                >
                                    <div className="flex items-start justify-between gap-4">
                                        <div>
                                            <p className="text-xs uppercase tracking-[0.24em] text-slate-300">{role.badge}</p>
                                            <h3 className="mt-2 text-2xl font-semibold text-white">{role.name}</h3>
                                            <p className="mt-1 text-sm text-slate-200/80">{role.subtitle}</p>
                                        </div>
                                        <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs text-slate-100">Access</span>
                                    </div>
                                    <ul className="mt-5 space-y-2 text-sm text-slate-100/90">
                                        {role.items.map((item) => (
                                            <li key={item} className="flex items-center gap-2">
                                                <span className="h-2 w-2 rounded-full bg-white/80" />
                                                {item}
                                            </li>
                                        ))}
                                    </ul>
                                </article>
                            ))}
                        </div>
                    </section>

                    <aside className="fade-up fade-up-delay-2 grid gap-6">
                        <div className="rounded-[2rem] border border-white/10 bg-slate-950/55 p-6 shadow-2xl shadow-black/30 backdrop-blur-xl">
                            <div className="flex items-center justify-between gap-4">
                                <div>
                                    <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Database posture</p>
                                    <h3 className="mt-2 text-xl font-semibold text-white">Shared DB safe mode</h3>
                                </div>
                                <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs text-emerald-200">No schema edits</span>
                            </div>
                            <div className="mt-5 space-y-3 text-sm leading-6 text-slate-300">
                                <p>Laravel hanya memetakan model ke tabel existing.</p>
                                <p>Tidak ada migration baru yang menyentuh database user.</p>
                                <p>Semua pembagian akses berjalan di model, middleware, controller, dan view.</p>
                            </div>
                        </div>

                        <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/20 backdrop-blur-xl">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Menu yang disarankan</p>
                                    <h3 className="mt-2 text-xl font-semibold text-white">Navigation map</h3>
                                </div>
                            </div>
                            <div className="mt-5 space-y-3">
                                {['Dashboard', 'Orders', 'Products', 'Notifications', 'Users / Profiles', 'Settings'].map((item) => (
                                    <div key={item} className="flex items-center justify-between rounded-2xl border border-white/8 bg-slate-950/35 px-4 py-3 text-sm text-slate-200">
                                        <span>{item}</span>
                                        <span className="text-slate-500">→</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </aside>
                </div>

                <section className="fade-up fade-up-delay-3 mb-4 rounded-[2rem] border border-white/10 bg-slate-950/55 p-6 shadow-2xl shadow-black/25 backdrop-blur-xl sm:p-8">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                            <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Existing tables</p>
                            <h3 className="mt-2 text-2xl font-semibold text-white">Database map for admin and user views</h3>
                        </div>
                        <p className="max-w-xl text-sm leading-6 text-slate-400">
                            Semua tabel di bawah tetap dipakai bersama oleh admin console dan aplikasi user, jadi desainnya fokus ke pemetaan akses, bukan perubahan struktur.
                        </p>
                    </div>

                    <div className="mt-6 overflow-hidden rounded-[1.5rem] border border-white/10">
                        <div className="grid grid-cols-1 bg-white/5 px-5 py-3 text-xs font-semibold uppercase tracking-[0.24em] text-slate-400 sm:grid-cols-[1fr_1.2fr_1.4fr]">
                            <span>Table</span>
                            <span>Use case</span>
                            <span>Role / note</span>
                        </div>
                        <div className="divide-y divide-white/8">
                            {tableMap.map((row) => (
                                <div key={row.table} className="grid grid-cols-1 gap-2 px-5 py-4 text-sm text-slate-200 sm:grid-cols-[1fr_1.2fr_1.4fr] sm:gap-4">
                                    <span className="font-semibold text-white">{row.table}</span>
                                    <span className="text-slate-300">{row.desc}</span>
                                    <span className="text-slate-400">{row.note}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            </section>
        </main>
    );
}
