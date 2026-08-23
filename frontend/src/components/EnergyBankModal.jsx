import React, { useState } from 'react';
import Countdown from './Countdown';
import PurchaseRow from './PurchaseRow';
import { tapApi } from '../api/endpoints';
import './FeatureModal.css';

export default function EnergyBankModal({ state, onPurchased }) {
  const [buying, setBuying] = useState(false);
  const [error, setError] = useState(null);
  const bank = state?.energyBank;

  const buy = async () => {
    setBuying(true);
    setError(null);
    try {
      await tapApi.purchaseEnergyBank();
      if (onPurchased) onPurchased();
    } catch (err) {
      setError(err?.response?.data?.message || 'Purchase failed');
    } finally {
      setBuying(false);
    }
  };

  return (
    <div className="feature-modal">
      {bank?.active ? (
        <div className="feature-modal__status">
          <div className="feature-modal__status-row">
            <span>Bank Energy</span>
            <strong>{bank.current} / {bank.capacity}</strong>
          </div>
          <div className="feature-modal__status-row">
            <span>Expires in</span>
            <strong>
              <Countdown expiresAt={bank.expiresAt} />
            </strong>
          </div>
          <p className="feature-modal__note">Bank Energy is consumed before your normal Energy.</p>
        </div>
      ) : (
        <p className="feature-modal__note">No active Energy Bank. Purchase one to get a separate 3-day energy reserve.</p>
      )}

      {error && <div className="feature-modal__error">{error}</div>}

      <PurchaseRow
        title={bank?.active ? 'Add More Bank Capacity' : 'Purchase Energy Bank'}
        benefit={bank?.active ? '+500 capacity (up to 1000 total this cycle)' : '500 Energy reserve, +20 every 120 minutes'}
        cost={bank?.purchaseCount >= 1 ? '500 VE' : '100 VE'}
        duration="3 days"
        buying={buying}
        disabled={bank?.purchaseCount >= 2}
        disabledReason="Limit reached"
        onBuy={buy}
      />
    </div>
  );
}
