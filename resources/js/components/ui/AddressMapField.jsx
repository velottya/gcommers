import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import { MapPin } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { geocodeAddress } from '../../utils/nominatim';

// Vite tidak resolve path gambar default Leaflet, override manual.
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: markerIcon2x,
    iconUrl: markerIcon,
    shadowUrl: markerShadow,
});

const DEFAULT_CENTER = { lat: -7.2575, lng: 112.7521 }; // Surabaya, default peta Jawa Timur

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// "Kab." / "Kec." pada data wilayah tidak dikenali pencarian Nominatim
// (mis. "Kab. Malang" gagal, padahal "Kabupaten Malang" ditemukan) — jadi
// diperluas dulu sebelum dipakai sebagai query.
function expandWilayahAbbr(nama) {
    if (!nama) return nama;
    return nama
        .replace(/^Kab\.\s*/i, 'Kabupaten ')
        .replace(/^Kec\.\s*/i, 'Kecamatan ');
}

// Susun beberapa kandidat query, dari alamat paling detail ke yang paling umum
// (kecamatan/kabupaten/propinsi saja), supaya selalu ada titik yang ditemukan —
// sedekat mungkin dengan alamat lengkap yang diisi.
function buildAddressCandidates(alamat, kelurahan, kecamatanNama, kabupatenNama, propinsiNama, kodePos) {
    const parts = [alamat, kelurahan, expandWilayahAbbr(kecamatanNama), expandWilayahAbbr(kabupatenNama), propinsiNama];
    const levels = [[...parts, kodePos]];
    for (let i = 1; i < parts.length; i++) levels.push(parts.slice(i));

    const queries = levels.map(level => level.filter(Boolean).join(', ')).filter(Boolean);
    return [...new Set(queries)]; // buang duplikat kalau beberapa level sama (mis. kelurahan kosong)
}

// Field gabungan: textarea alamat + tombol "Cari di Peta" + peta Leaflet dengan
// marker yang bisa digeser/diklik + input readonly latitude/longitude. Geocoding
// pakai Nominatim/OpenStreetMap (gratis, tanpa API key).
export default function AddressMapField({
    active, resetSignal,
    alamat, onAlamatChange,
    kelurahan, kecamatanNama, kabupatenNama, propinsiNama, kodePos,
    latitude, longitude, onLocationChange,
    alamatLabel = 'Alamat Lengkap',
}) {
    const mapRef    = useRef(null);
    const mapObj    = useRef(null);
    const markerObj = useRef(null);
    const [geoError,  setGeoError]  = useState('');
    const [geocoding, setGeocoding] = useState(false);

    // Pasang marker yang bisa digeser bebas oleh user; posisi baru otomatis mengisi lat/long.
    function placeDraggableMarker(map, latlng) {
        const marker = L.marker(latlng, { draggable: true }).addTo(map);
        marker.on('dragend', () => {
            const pos = marker.getLatLng();
            onLocationChange(pos.lat.toFixed(7), pos.lng.toFixed(7));
        });
        return marker;
    }

    useEffect(() => {
        if (!active || !mapRef.current) return;
        setGeoError('');

        const center = (latitude && longitude)
            ? [parseFloat(latitude), parseFloat(longitude)]
            : [DEFAULT_CENTER.lat, DEFAULT_CENTER.lng];

        const map = L.map(mapRef.current).setView(center, latitude ? 16 : 12);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            maxZoom: 19,
        }).addTo(map);
        mapObj.current = map;

        markerObj.current = (latitude && longitude) ? placeDraggableMarker(map, center) : null;

        // Klik di mana pun pada peta juga memindahkan/membuat titik.
        map.on('click', (e) => {
            const { lat, lng } = e.latlng;
            if (markerObj.current) {
                markerObj.current.setLatLng([lat, lng]);
            } else {
                markerObj.current = placeDraggableMarker(map, [lat, lng]);
            }
            onLocationChange(lat.toFixed(7), lng.toFixed(7));
        });

        return () => {
            map.remove();
            mapObj.current = null;
            markerObj.current = null;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [active, resetSignal]);

    // Cari koordinat dari alamat + data wilayah terpilih (Nominatim/OSM). Kalau alamat
    // selengkapnya tidak ditemukan, coba lagi dengan query yang lebih umum sampai dapat
    // titik—jadi map tetap mendekati lokasi meski alamat persisnya belum terpetakan di OSM.
    async function handleCariPeta() {
        if (!alamat?.trim()) {
            setGeoError('Isi alamat lengkap terlebih dahulu.');
            return;
        }
        setGeoError('');
        setGeocoding(true);

        try {
            const candidates = buildAddressCandidates(alamat, kelurahan, kecamatanNama, kabupatenNama, propinsiNama, kodePos);
            let result = null;

            for (let i = 0; i < candidates.length; i++) {
                if (i > 0) await sleep(400); // hormati rate limit Nominatim (~1 req/detik)
                result = await geocodeAddress(candidates[i]);
                if (result) break;
            }

            if (!result) {
                setGeoError('Lokasi tidak ditemukan. Pilih Propinsi/Kabupaten/Kecamatan atau perjelas alamat.');
                return;
            }

            const { lat, lng } = result;
            const latlng = [lat, lng];

            mapObj.current.flyTo(latlng, 16);

            if (markerObj.current) {
                markerObj.current.setLatLng(latlng);
            } else {
                markerObj.current = placeDraggableMarker(mapObj.current, latlng);
            }

            onLocationChange(lat.toFixed(7), lng.toFixed(7));
        } catch (err) {
            setGeoError(err.message || 'Gagal mencari lokasi.');
        } finally {
            setGeocoding(false);
        }
    }

    function handleAlamatKeyDown(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleCariPeta();
        }
    }

    return (
        <div className="space-y-3">
            <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-400">{alamatLabel}</label>
                <textarea
                    value={alamat}
                    onChange={e => onAlamatChange(e.target.value)}
                    onKeyDown={handleAlamatKeyDown}
                    rows={2}
                    className="w-full resize-none rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-teal-400/40 transition"
                />
            </div>

            <div className="flex items-center justify-between gap-3">
                <button type="button" onClick={handleCariPeta} disabled={geocoding}
                    className="flex items-center gap-2 rounded-xl border border-teal-400/30 bg-teal-400/10 px-3 py-2 text-xs font-medium text-teal-300 hover:bg-teal-400/20 disabled:opacity-50 transition">
                    <MapPin size={14} />
                    {geocoding ? 'Mencari…' : 'Cari di Peta'}
                </button>
                {geoError && <p className="text-xs text-red-400">{geoError}</p>}
            </div>

            <div id="map" ref={mapRef} className="h-48 w-full rounded-xl border border-white/10 bg-slate-800" />
            <p className="text-xs text-slate-500">Klik peta atau geser (drag) marker untuk menyesuaikan posisi secara presisi.</p>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                    <label className="block text-xs font-medium text-slate-400">Latitude</label>
                    <input type="text" readOnly value={latitude}
                        className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white outline-none" />
                </div>
                <div className="space-y-1">
                    <label className="block text-xs font-medium text-slate-400">Longitude</label>
                    <input type="text" readOnly value={longitude}
                        className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white outline-none" />
                </div>
            </div>
        </div>
    );
}
