import React from 'react';
import './StreakIndicator.css';

export default function StreakIndicator({ count }) {
  if (!count) return null;
  return (
    <div className="streak-indicator">
      <span className="streak-indicator__flame">🔥</span>
      <span className="streak-indicator__count">{count}</span>
    </div>
  );
}
