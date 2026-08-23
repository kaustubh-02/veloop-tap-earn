import React, { useEffect, useState } from 'react';
import './RewardToast.css';

const CURRENCY_LABEL = {
  sve: 'SVE',
  ve: 'VE',
  spin: 'Spin',
  spins: 'Spins',
  gems: 'Gems',
  tokens: 'Tokens',
};

/**
 * RewardToast — compact floating "+1 SVE" style feedback that appears on
 * every accepted tap and fades/floats upward (spec 3, 44.2 step 9).
 * Keyed by lastReward.id from the parent so each tap gets a fresh mount
 * (and therefore a fresh animation) even if the reward type repeats.
 */
export default function RewardToast({ reward }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    setVisible(true);
    const timer = setTimeout(() => setVisible(false), 900);
    return () => clearTimeout(timer);
  }, [reward?.id]);

  if (!reward || !visible) return null;

  const label = CURRENCY_LABEL[reward.type] || reward.type;

  return (
    <div className="reward-toast" key={reward.id}>
      <span className={`reward-toast__pill reward-toast__pill--${reward.type}`}>
        +{reward.amount} {label}
      </span>
      {reward.mystery && (
        <span className="reward-toast__pill reward-toast__pill--mystery">Mystery! +{reward.mystery.amount} SVE</span>
      )}
      {reward.precision && (
        <span className="reward-toast__pill reward-toast__pill--precision">Precision! +{reward.precision.amount} Tokens</span>
      )}
    </div>
  );
}
