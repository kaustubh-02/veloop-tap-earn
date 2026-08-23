import React from 'react';
import { NavLink } from 'react-router-dom';
import './BottomNav.css';

const ITEMS = [
  { to: '/', label: 'Home', icon: '🏠' },
  { to: '/tap', label: 'Tap & Earn', icon: '⚡' },
  { to: '/mine', label: 'Mine', icon: '⛏️' },
  { to: '/wallet', label: 'Wallet', icon: '👛' },
  { to: '/profile', label: 'Profile', icon: '👤' },
];

export default function BottomNav() {
  return (
    <nav className="bottom-nav">
      {ITEMS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) => `bottom-nav__item ${isActive ? 'bottom-nav__item--active' : ''}`}
          end={item.to === '/'}
        >
          <span className="bottom-nav__icon">{item.icon}</span>
          <span className="bottom-nav__label">{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
