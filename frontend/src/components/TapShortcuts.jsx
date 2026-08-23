import React from 'react';
import './TapShortcuts.css';

const SHORTCUTS = [
  { key: 'daily', label: 'Daily Challenge', icon: '🎯' },
  { key: 'missions', label: 'Missions', icon: '📋' },
  { key: 'lucky', label: 'Lucky Spin', icon: '🎡' },
  { key: 'energyBank', label: 'Energy Bank', icon: '🔋' },
  { key: 'shield', label: 'Shield', icon: '🛡️' },
  { key: 'upgrades', label: 'Upgrades', icon: '⚙️' },
  { key: 'league', label: 'Tap League', icon: '🏆' },
];

export default function TapShortcuts({ onOpen, luckyReady }) {
  return (
    <div className="tap-shortcuts scrollbar-hidden">
      {SHORTCUTS.map((s) => (
        <button type="button" key={s.key} className="tap-shortcuts__item" onClick={() => onOpen(s.key)}>
          <span className="tap-shortcuts__icon">{s.icon}</span>
          <span className="tap-shortcuts__label">{s.label}</span>
          {s.key === 'lucky' && luckyReady && <span className="tap-shortcuts__badge" />}
        </button>
      ))}
    </div>
  );
}
