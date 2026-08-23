import React from 'react';
import BottomNav from '../components/BottomNav';
import { useAuth } from '../context/AuthContext';
import './PlaceholderPage.css';

function PlaceholderPage({ title, subtitle }) {
  return (
    <div className="placeholder-page">
      <div className="placeholder-page__content">
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
      <BottomNav />
    </div>
  );
}

export function HomePage() {
  const { user } = useAuth();
  return <PlaceholderPage title={`Welcome back, ${user?.displayName || ''}`} subtitle="Head to Tap & Earn to start earning." />;
}

export function MinePage() {
  return <PlaceholderPage title="Mine" subtitle="Other VELoop mining features live here." />;
}

export function WalletPage() {
  return <PlaceholderPage title="Wallet" subtitle="Your VELoop wallet and transaction history." />;
}

export function ProfilePage() {
  const { user, logout } = useAuth();
  return (
    <div className="placeholder-page">
      <div className="placeholder-page__content">
        <h1>{user?.displayName}</h1>
        <p>{user?.email}</p>
        <button type="button" className="placeholder-page__logout" onClick={logout}>
          Log out
        </button>
      </div>
      <BottomNav />
    </div>
  );
}
