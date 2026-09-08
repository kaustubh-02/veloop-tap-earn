import React from 'react';
import Countdown from './Countdown';
import './BoostCard.css';

export default function BoostCard({ boost, onActivate, activating }) {
  if (!boost) return null;

  if (boost.active) {
    return (
      <div className="boost-card boost-card--active">
        <span className="boost-card__pulse" />
        <span className="boost-card__icon">🚀</span>
        <div>
          <div className="boost-card__title">Boost Active — {boost.multiplier}x</div>
          <div className="boost-card__subtitle">
            Ends in <Countdown expiresAt={boost.expiresAt} format="seconds" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <button type="button" className="boost-card" onClick={onActivate} disabled={activating}>
      <span className="boost-card__icon">🚀</span>
      <div>
        <div className="boost-card__title">Boost</div>
        <div className="boost-card__subtitle">Activate a 30s reward multiplier</div>
      </div>
      <span className="boost-card__cta">{activating ? '...' : 'Activate'}</span>
    </button>
  );
}
