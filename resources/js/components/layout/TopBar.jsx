import { Bell, Menu } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client';

export default function TopBar({ user, onMenuToggle }) {
    const [unread, setUnread]   = useState(0);
    const navigate              = useNavigate();

    useEffect(() => {
        api.get('/notifications', { unread_only: true, page: 1 })
            .then(data => setUnread(data?.total ?? 0))
            .catch(() => {});
    }, []);

    return (
        <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b border-white/8 bg-slate-950/80 px-4 backdrop-blur-xl lg:px-6">
            {/* Mobile menu toggle */}
            <button
                onClick={onMenuToggle}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-white/8 hover:text-white lg:hidden"
                aria-label="Buka menu"
            >
                <Menu size={20} />
            </button>

            {/* Spacer */}
            <div className="flex-1" />

            {/* Notifications bell */}
            <button
                onClick={() => navigate('/notifications')}
                className="relative rounded-lg p-1.5 text-slate-400 hover:bg-white/8 hover:text-white transition"
                aria-label="Notifikasi"
            >
                <Bell size={20} strokeWidth={1.75} />
                {unread > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-400 text-[9px] font-bold text-slate-950">
                        {unread > 9 ? '9+' : unread}
                    </span>
                )}
            </button>

            {/* Role chip */}
            <span className="hidden rounded-full border border-white/10 bg-white/6 px-3 py-1 text-xs text-slate-400 sm:inline-flex">
                {user.role}
            </span>
        </header>
    );
}
