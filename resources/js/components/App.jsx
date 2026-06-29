import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import Layout from './layout/Layout';
import AdminRegionList from './pages/AdminRegionList';
import AdminTransportList from './pages/AdminTransportList';
import AjuanStok from './pages/AjuanStok';
import AlokasiSopir from './pages/AlokasiSopir';
import AppUserList from './pages/AppUserList';
import Dashboard from './pages/Dashboard';
import GudangSubmissionList from './pages/GudangSubmissionList';
import HargaProduk from './pages/HargaProduk';
import NotificationList from './pages/NotificationList';
import OrderDetail from './pages/OrderDetail';
import OrderList from './pages/OrderList';
import Persetujuan from './pages/Persetujuan';
import PesananRekap from './pages/PesananRekap';
import ProductDetail from './pages/ProductDetail';
import ProductList from './pages/ProductList';
import QuotaSubsidi from './pages/QuotaSubsidi';
import RekapTagihan from './pages/RekapTagihan';
import SoSubmissionList from './pages/SoSubmissionList';
import SystemSettings from './pages/SystemSettings';
import TarifTransportir from './pages/TarifTransportir';
import TransportProfile from './pages/TransportProfile';
import WarehouseList from './pages/WarehouseList';

export default function App({ user }) {
    if (!user) {
        window.location.href = '/login';
        return null;
    }

    const { role } = user;

    return (
        <BrowserRouter>
            <Layout user={user}>
                <Routes>
                    <Route path="/" element={<Navigate to="/dashboard" replace />} />
                    <Route path="/dashboard" element={<Dashboard user={user} />} />

                    {role !== 'AdminTransport' && (
                        <Route path="/orders" element={<OrderList user={user} />} />
                    )}
                    <Route path="/orders/:id" element={<OrderDetail user={user} />} />

                    {role !== 'AdminTransport' && (
                        <Route path="/products" element={<ProductList user={user} />} />
                    )}
                    {role !== 'AdminTransport' && (
                        <Route path="/products/:id" element={<ProductDetail />} />
                    )}

                    {(role === 'SuperAdmin' || role === 'AdminRegion') && (
                        <Route path="/admin-region" element={<AdminRegionList user={user} />} />
                    )}
                    {role === 'SuperAdmin' && (
                        <Route path="/admin-transport" element={<AdminTransportList user={user} />} />
                    )}

                    <Route path="/notifications" element={<NotificationList user={user} />} />

                    {role === 'AdminTransport' && (
                        <Route path="/profile" element={<TransportProfile user={user} />} />
                    )}

                    {(role === 'SuperAdmin' || role === 'AdminRegion' || role === 'AdminTransport') && (
                        <Route path="/app-users" element={<AppUserList user={user} />} />
                    )}

                    {/* ─── SuperAdmin only ─── */}
                    {role === 'SuperAdmin' && (
                        <Route path="/settings"       element={<SystemSettings user={user} />} />
                    )}
                    {role === 'SuperAdmin' && (
                        <Route path="/pesanan-rekap"  element={<PesananRekap />} />
                    )}
                    {role === 'SuperAdmin' && (
                        <Route path="/persetujuan"    element={<Persetujuan />} />
                    )}

                    {/* ─── SuperAdmin + AdminRegion ─── */}
                    {(role === 'SuperAdmin' || role === 'AdminRegion') && (
                        <Route path="/quota-subsidi"  element={<QuotaSubsidi user={user} />} />
                    )}
                    {role === 'AdminRegion' && (
                        <Route path="/gudang"  element={<GudangSubmissionList user={user} />} />
                    )}

                    {/* ─── AdminRegion only ─── */}
                    {role === 'AdminRegion' && (
                        <Route path="/harga-produk"  element={<HargaProduk user={user} />} />
                    )}
                    {role === 'AdminRegion' && (
                        <Route path="/tarif-transportir" element={<TarifTransportir user={user} />} />
                    )}
                    {role === 'AdminRegion' && (
                        <Route path="/so-submissions" element={<SoSubmissionList user={user} />} />
                    )}
                    <Route
                        path="/ajuan-stok"
                        element={role === 'AdminRegion' ? <AjuanStok user={user} /> : <Navigate to="/dashboard" replace />}
                    />

                    {/* ─── AdminTransport only ─── */}
                    {role === 'AdminTransport' && (
                        <Route path="/alokasi-sopir"  element={<AlokasiSopir user={user} />} />
                    )}
                    {role === 'AdminTransport' && (
                        <Route path="/rekap-tagihan"  element={<RekapTagihan user={user} />} />
                    )}
                    {(role === 'SuperAdmin' || role === 'AdminTransport') && (
                        <Route path="/gudang"  element={<WarehouseList user={user} />} />
                    )}

                    <Route path="*" element={<Navigate to="/dashboard" replace />} />
                </Routes>
            </Layout>
        </BrowserRouter>
    );
}
