import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import TapEarnPage from './pages/TapEarnPage';
import TapLeaguePage from './pages/TapLeaguePage';
import AdminPage from './pages/AdminPage';
import { HomePage, MinePage, WalletPage, ProfilePage } from './pages/PlaceholderPages';

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        <Route
          path="/"
          element={
            <ProtectedRoute>
              <HomePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/tap"
          element={
            <ProtectedRoute>
              <TapEarnPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/league"
          element={
            <ProtectedRoute>
              <TapLeaguePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/mine"
          element={
            <ProtectedRoute>
              <MinePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/wallet"
          element={
            <ProtectedRoute>
              <WalletPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <AdminPage />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}
