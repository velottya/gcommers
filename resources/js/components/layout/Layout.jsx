import React, { useState } from 'react';
import Sidebar from './Sidebar';
import TopBar from './TopBar';

export default function Layout({ user, children }) {
    const [sidebarOpen, setSidebarOpen] = useState(false);

    return (
        <div className="flex min-h-screen">
            <Sidebar
                user={user}
                open={sidebarOpen}
                onClose={() => setSidebarOpen(false)}
            />

            {/* Spacer agar konten tidak tertindih sidebar yang fixed */}
            <div className="hidden lg:block w-64 shrink-0" />

            {/* Main area */}
            <div className="flex flex-1 flex-col min-w-0">
                <TopBar user={user} onMenuToggle={() => setSidebarOpen(true)} />

                <main className="flex-1 overflow-y-auto p-4 lg:p-6">
                    {children}
                </main>
            </div>
        </div>
    );
}
