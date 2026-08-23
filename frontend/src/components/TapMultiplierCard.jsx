import React from 'react';
import Countdown from './Countdown';
import './TapMultiplierCard.css';

export default function TapMultiplierCard({ multitap, efficiency, onOpenUpgrades }) {
  if (!multitap || !efficiency) return null;

  return (
    <button type="button" className="multiplier-card" onClick={onOpenUpgrades}>
      <div className="multiplier-card__item">
        <span className="multiplier-card__label">Multitap</span>
        <span className="multiplier-card__value">{multitap.tier}</span>
        {multitap.expiresAt && (
          <span className="multiplier-card__expiry">
            <Countdown expiresAt={multitap.expiresAt} />
          </span>
        )}
      </div>
      <div className="multiplier-card__divider" />
      <div className="multiplier-card__item">
        <span className="multiplier-card__label">Efficiency</span>
        <span className="multiplier-card__value">{efficiency.tier}</span>
        {efficiency.expiresAt && (
          <span className="multiplier-card__expiry">
            <Countdown expiresAt={efficiency.expiresAt} />
          </span>
        )}
      </div>
    </button>
  );
}
