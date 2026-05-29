import './bootstrap';
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './components/App';

const container = document.getElementById('app');

if (container) {
    const user = JSON.parse(container.dataset.user || 'null');

    createRoot(container).render(
        <React.StrictMode>
            <App user={user} />
        </React.StrictMode>,
    );
}
