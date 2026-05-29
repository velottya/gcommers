import React from 'react';

function InfoRow({ label, value }) {
    return (
        <div className="grid grid-cols-[160px_1fr] items-start gap-4 py-3 border-b border-white/6 last:border-0">
            <dt className="text-xs uppercase tracking-[0.2em] text-slate-500">{label}</dt>
            <dd className="text-sm text-slate-200">{value || '—'}</dd>
        </div>
    );
}

export default function TransportProfile({ user }) {
    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-semibold text-white">Transport Profile</h1>

            {/* Personal info */}
            <div className="rounded-2xl border border-white/8 bg-slate-950/55 p-6">
                <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Informasi Akun</h2>
                <dl>
                    <InfoRow label="Nama"       value={user.displayName} />
                    <InfoRow label="Email"      value={user.email} />
                    <InfoRow label="Role"       value={user.role} />
                    <InfoRow label="Nama PIC"   value={user.picName} />
                </dl>
            </div>

            {/* Company info */}
            <div className="rounded-2xl border border-sky-400/15 bg-sky-400/5 p-6">
                <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-sky-400/70">Informasi Perusahaan</h2>
                <dl>
                    <InfoRow label="Perusahaan"     value={user.companyName} />
                    <InfoRow label="Nama Transportir" value={user.transportirName} />
                    <InfoRow label="No. Polisi"     value={user.policeNumber} />
                </dl>
            </div>

            <p className="text-xs text-slate-600">
                Untuk mengubah informasi profil, hubungi SuperAdmin atau AdminRegion.
            </p>
        </div>
    );
}
