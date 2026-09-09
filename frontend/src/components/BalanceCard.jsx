import React from 'react';
import VeloopAvatar from './VeloopAvatar';
import './BalanceCard.css';

const CURRENCY_META = {
  ve: { label: 'VE', color: 'var(--currency-ve)' },
  sve: { label: 'SVE', color: 'var(--currency-sve)' },
  tokens: { label: 'Tokens', color: 'var(--currency-tokens)' },
  gems: { label: 'Gems', color: 'var(--currency-gems)' },
  spins: { label: 'Spins', color: 'var(--currency-spins)' },
};

/**
 * BalanceCard — priority #3 in first-view hierarchy (spec 44.1). Shows
 * the primary VE balance prominently plus a compact strip of the other
 * currencies, all sourced from authoritative backend balances (never
 * computed client-side).
 */
export default function BalanceCard({ balances, level, displayName, onOpenWallet }) {
  if (!balances) return null;

  return (
    <div className="balance-card">
      <div className="balance-card__identity">
        <div className="balance-card__avatar">
          <VeloopAvatar size={44} initial={(displayName || 'V')[0]} />
        </div>
        <div>
          <div className="balance-card__name">{displayName}</div>
          <div className="balance-card__level">Level {level}</div>
        </div>
      </div>

      <button type="button" className="balance-card__primary" onClick={onOpenWallet}>
        <span className="balance-card__primary-value">{formatNumber(balances.ve)}</span>
        <span className="balance-card__primary-label">VE</span>
      </button>

      <div className="balance-card__strip">
        {['sve', 'tokens', 'gems', 'spins'].map((key) => (
          <div className="balance-card__chip" key={key}>
            <span className="balance-card__chip-dot" style={{ background: CURRENCY_META[key].color }} />
            <span className="balance-card__chip-value">{formatNumber(balances[key])}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function formatNumber(n) {
  if (n == null) return '0';
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return Number.isInteger(n) ? n : n.toFixed(1);
}
