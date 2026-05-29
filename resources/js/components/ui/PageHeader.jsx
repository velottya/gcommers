import React from 'react';

export default function PageHeader({ title, subtitle, action }) {
    return (
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
            <div>
                <h1 className="text-2xl font-semibold text-white">{title}</h1>
                {subtitle && <p className="mt-1 text-sm text-slate-400">{subtitle}</p>}
            </div>
            {action && <div>{action}</div>}
        </div>
    );
}
