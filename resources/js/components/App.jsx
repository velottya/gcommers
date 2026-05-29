import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import Layout from './layout/Layout';
import Dashboard from './pages/Dashboard';
import NotificationList from './pages/NotificationList';
import OrderDetail from './pages/OrderDetail';
import OrderList from './pages/OrderList';
import ProductList from './pages/ProductList';
import SystemSettings from './pages/SystemSettings';
import TransportProfile from './pages/TransportProfile';
import UserList from './pages/UserList';

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

                    <Route path="/orders" element={<OrderList user={user} />} />
                    <Route path="/orders/:id" element={<OrderDetail user={user} />} />

                    {role !== 'AdminTransport' && (
                        <Route path="/products" element={<ProductList />} />
                    )}

                    {role !== 'AdminTransport' && (
                        <Route path="/users" element={<UserList user={user} />} />
                    )}

                    <Route path="/notifications" element={<NotificationList user={user} />} />

                    {role === 'AdminTransport' && (
                        <Route path="/profile" element={<TransportProfile user={user} />} />
                    )}

                    {role === 'SuperAdmin' && (
                        <Route path="/settings" element={<SystemSettings user={user} />} />
                    )}

                    <Route path="*" element={<Navigate to="/dashboard" replace />} />
                </Routes>
            </Layout>
        </BrowserRouter>
    );
}
