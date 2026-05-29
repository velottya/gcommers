import './bootstrap';
import React from 'react';
import { createRoot } from 'react-dom/client';
import AdminLanding from './components/AdminLanding';

const container = document.getElementById('app');

if (container) {
    const adminRole = container.dataset.adminRole || null;
    const pageContext = container.dataset.pageContext || 'landing';

    createRoot(container).render(
        <React.StrictMode>
            <AdminLanding adminRole={adminRole} pageContext={pageContext} />
        </React.StrictMode>,
    );
}
