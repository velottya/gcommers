const getCsrfToken = () =>
    document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') ?? '';

class ApiError extends Error {
    constructor(message, status, errors = {}) {
        super(message);
        this.status = status;
        this.errors = errors;
    }
}

async function apiFetch(path, options = {}) {
    const res = await fetch(`/api/admin${path}`, {
        credentials: 'same-origin',
        headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'X-CSRF-TOKEN': getCsrfToken(),
            ...options.headers,
        },
        ...options,
    });

    if (res.status === 401) {
        window.location.href = '/login';
        return;
    }

    if (res.status === 204) return null;

    const body = await res.json().catch(() => ({ message: `HTTP ${res.status}` }));

    if (!res.ok) {
        throw new ApiError(
            body.message || `HTTP ${res.status}`,
            res.status,
            body.errors || {},
        );
    }

    return body;
}

function buildQuery(params = {}) {
    const sp = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') sp.set(k, v);
    });
    const s = sp.toString();
    return s ? `?${s}` : '';
}

export const api = {
    get:    (path, params = {}) => apiFetch(`${path}${buildQuery(params)}`),
    post:   (path, body = {})   => apiFetch(path, { method: 'POST',   body: JSON.stringify(body) }),
    patch:  (path, body = {})   => apiFetch(path, { method: 'PATCH',  body: JSON.stringify(body) }),
    put:    (path, body = {})   => apiFetch(path, { method: 'PUT',    body: JSON.stringify(body) }),
    del:    (path)              => apiFetch(path, { method: 'DELETE' }),
};
