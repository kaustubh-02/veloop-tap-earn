import React from 'react';
import Countdown from './Countdown';
import './EnergyBar.css';

/**
 * EnergyBar — priority #2 in the first-view information hierarchy
 * (spec 44.1). Shows current/max energy, the recharge rate, and a live
 * countdown to the next tick. Never lets the bar visually exceed 100%.
 */
export default function EnergyBar({ energy, onEmpty }) {
  if (!energy) return null;
  const pct = Math.min(100, Math.round((energy.current / energy.max) * 100));
  const isLow = pct <= 15;
  const isFull = energy.current >= energy.max;

  return (
    <div className="energy-card">
      <div className="energy-card__top">
        <span className="energy-card__label">
          <span className="energy-card__icon">⚡</span> Energy
        </span>
        <span className={`energy-card__value ${isLow ? 'energy-card__value--low' : ''}`}>
          {Math.floor(energy.current)} <span className="energy-card__max">/ {energy.max}</span>
        </span>
      </div>
      <div className="energy-card__track" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
        <div
          className={`energy-card__fill ${isLow ? 'energy-card__fill--low' : ''}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="energy-card__bottom">
        <span className="energy-card__rate">+{energy.rechargeRate} / {energy.rechargeIntervalMinutes}m</span>
        {!isFull && energy.nextRechargeAt && (
          <span className="energy-card__next">
            next in <Countdown expiresAt={energy.nextRechargeAt} onExpire={onEmpty} />
          </span>
        )}
        {isFull && <span className="energy-card__next">Full</span>}
      </div>
    </div>
  );
}
