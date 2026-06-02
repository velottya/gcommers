import {
    Bell,
    LayoutDashboard,
    LogOut,
    Package,
    Settings,
    ShoppingCart,
    Store,
    Truck,
    User,
    Users,
    X,
} from 'lucide-react';
import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';

const MENUS = {
    SuperAdmin: [
        { icon: LayoutDashboard, label: 'Dashboard',      path: '/dashboard' },
        { icon: ShoppingCart,    label: 'Orders',         path: '/orders' },
        { icon: Package,         label: 'Products',       path: '/products' },
        { icon: Users,           label: 'Admin Users',    path: '/users' },
        { icon: Store,           label: 'App Users',      path: '/app-users' },
        { icon: Bell,            label: 'Notifications',  path: '/notifications' },
        { icon: Settings,        label: 'Settings',       path: '/settings' },
    ],
    AdminRegion: [
        { icon: LayoutDashboard, label: 'Dashboard',        path: '/dashboard' },
        { icon: ShoppingCart,    label: 'Orders',           path: '/orders' },
        { icon: Package,         label: 'Products',         path: '/products' },
        { icon: Users,           label: 'Regional Admins',  path: '/users' },
        { icon: Store,           label: 'App Users',        path: '/app-users' },
        { icon: Bell,            label: 'Notifications',    path: '/notifications' },
    ],
    AdminTransport: [
        { icon: LayoutDashboard, label: 'Dashboard',         path: '/dashboard' },
        { icon: Truck,           label: 'Assigned Orders',   path: '/orders' },
        { icon: Users,           label: 'App Users',         path: '/app-users' },
        { icon: Bell,            label: 'Notifications',     path: '/notifications' },
        { icon: User,            label: 'Transport Profile', path: '/profile' },
    ],
};

const ROLE_BADGE = {
    SuperAdmin:     { label: 'Global control', color: 'from-amber-400/25 to-orange-500/10 border-amber-400/25 text-amber-200' },
    AdminRegion:    { label: 'Regional scope', color: 'from-teal-400/25 to-cyan-500/10 border-teal-400/25 text-teal-200' },
    AdminTransport: { label: 'Delivery ops',   color: 'from-sky-400/25 to-blue-500/10 border-sky-400/25 text-sky-200' },
};

export default function Sidebar({ user, open, onClose }) {
    const navigate = useNavigate();
    const menu     = MENUS[user.role] ?? [];
    const badge    = ROLE_BADGE[user.role];

    async function handleLogout() {
        const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
        await fetch('/logout', {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'X-CSRF-TOKEN': csrfToken ?? '' },
        });
        window.location.href = '/login';
    }

    return (
        <>
            {/* Overlay (mobile) */}
            {open && (
                <div
                    className="fixed inset-0 z-20 bg-black/60 backdrop-blur-sm lg:hidden"
                    onClick={onClose}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`fixed inset-y-0 left-0 z-30 flex w-64 flex-col border-r border-white/8 bg-slate-950/90 backdrop-blur-xl transition-transform duration-300
                    ${open ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-5 pt-6 pb-4">
                    <div>
                        <p className="text-xs uppercase tracking-[0.32em] text-slate-500">Gcommers</p>
                        <h2 className="mt-0.5 text-base font-semibold text-white">Admin Console</h2>
                    </div>
                    <button onClick={onClose} className="lg:hidden rounded-lg p-1.5 text-slate-400 hover:text-white hover:bg-white/8">
                        <X size={18} />
                    </button>
                </div>

                {/* Role badge */}
                <div className="px-4 pb-4">
                    <div className={`rounded-xl border bg-gradient-to-br ${badge?.color ?? ''} px-3 py-2.5`}>
                        <p className="text-[10px] uppercase tracking-[0.24em] opacity-70">{badge?.label}</p>
                        <p className="mt-0.5 text-sm font-semibold">{user.displayName || user.email}</p>
                        <p className="text-xs opacity-60 truncate">{user.email}</p>
                    </div>
                </div>

                {/* Nav */}
                <nav className="flex-1 space-y-1 overflow-y-auto px-3 pb-4">
                    {menu.map(({ icon: Icon, label, path }) => (
                        <NavLink
                            key={path}
                            to={path}
                            onClick={onClose}
                            className={({ isActive }) =>
                                `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition
                                ${isActive
                                    ? 'bg-white/10 text-white font-medium'
                                    : 'text-slate-400 hover:bg-white/6 hover:text-slate-200'
                                }`
                            }
                        >
                            <Icon size={18} strokeWidth={1.75} />
                            {label}
                        </NavLink>
                    ))}
                </nav>

                {/* Logout */}
                <div className="border-t border-white/8 p-3">
                    <button
                        onClick={handleLogout}
                        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-400 hover:bg-red-500/10 hover:text-red-300 transition"
                    >
                        <LogOut size={18} strokeWidth={1.75} />
                        Keluar
                    </button>
                </div>
            </aside>
        </>
    );
}
