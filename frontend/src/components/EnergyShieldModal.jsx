import React, { useState } from 'react';
import Countdown from './Countdown';
import PurchaseRow from './PurchaseRow';
import { tapApi } from '../api/endpoints';
import './FeatureModal.css';

export default function EnergyShieldModal({ state, onPurchased }) {
  const [buying, setBuying] = useState(false);
  const [error, setError] = useState(null);
  const shield = state?.shield;

  const buy = async () => {
    setBuying(true);
    setError(null);
    try {
      await tapApi.purchaseEnergyShield();
      if (onPurchased) onPurchased();
    } catch (err) {
      setError(err?.response?.data?.message || 'Purchase failed');
    } finally {
      setBuying(false);
    }
  };

  return (
    <div className="feature-modal">
      {shield?.active ? (
        <div className="feature-modal__status">
          <div className="feature-modal__status-row">
            <span>Shield active</span>
            <strong>
              <Countdown expiresAt={shield.expiresAt} format="seconds" />
            </strong>
          </div>
          <p className="feature-modal__note">90% of eligible taps consume no Energy while the shield is active.</p>
        </div>
      ) : (
        <p className="feature-modal__note">
          Activate a 30-second Energy Shield — most taps during this window won't consume Energy.
        </p>
      )}

      {error && <div className="feature-modal__error">{error}</div>}

      <PurchaseRow
        title="Activate Energy Shield"
        benefit="90% of taps consume no Energy for 30 seconds"
        cost="100 VE"
        duration="30 seconds, then 5 min cooldown"
        buying={buying}
        disabled={shield?.active || shield?.onCooldown}
        disabledReason={shield?.active ? 'Active' : 'On cooldown'}
        onBuy={buy}
      />

      {shield?.onCooldown && !shield?.active && (
        <p className="feature-modal__note">
          Available again in <Countdown expiresAt={shield.cooldownUntil} />
        </p>
      )}
    </div>
  );
}
