const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';

// Geocoding gratis via OpenStreetMap Nominatim (tanpa API key).
// Kebijakan penggunaan: maksimal ~1 request/detik, hanya untuk pemakaian interaktif ringan.
// https://operations.osmfoundation.org/policies/nominatim/
export async function geocodeAddress(address) {
    const params = new URLSearchParams({
        format: 'json',
        q: address,
        limit: '1',
        countrycodes: 'id',
    });

    const res = await fetch(`${NOMINATIM_URL}?${params.toString()}`);
    if (!res.ok) {
        throw new Error('Gagal menghubungi layanan pencarian alamat.');
    }

    const results = await res.json();
    if (!results.length) return null;

    return {
        lat: parseFloat(results[0].lat),
        lng: parseFloat(results[0].lon),
        displayName: results[0].display_name,
    };
}
