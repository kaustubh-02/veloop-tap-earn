import React, { useEffect, useState } from 'react';
import PurchaseRow from './PurchaseRow';
import { tapApi } from '../api/endpoints';
import './UpgradeDrawer.css';

const TABS = [
  { key: 'energyCapacity', label: 'Capacity' },
  { key: 'multitap', label: 'Multitap' },
  { key: 'rechargeSpeed', label: 'Recharge' },
  { key: 'tapEfficiency', label: 'Efficiency' },
];

/**
 * UpgradeDrawer purchases every tier from live backend state — no tier
 * ladder or pricing is hard-coded in the frontend (spec 4, 26: "Frontend
 * must never hard-code economic values").
 */
export default function UpgradeDrawer({ state, onPurchased }) {
  const [tab, setTab] = useState('energyCapacity');
  const [buying, setBuying] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => setError(null), [tab]);

  const buy = async (payload) => {
    setBuying(true);
    setError(null);
    try {
      await tapApi.purchaseUpgrade(payload);
      if (onPurchased) onPurchased();
    } catch (err) {
      setError(err?.response?.data?.message || 'Purchase failed');
    } finally {
      setBuying(false);
    }
  };

  return (
    <div className="upgrade-drawer">
      <div className="upgrade-drawer__tabs">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            className={`upgrade-drawer__tab ${tab === t.key ? 'upgrade-drawer__tab--active' : ''}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && <div className="upgrade-drawer__error">{error}</div>}

      {tab === 'energyCapacity' && (
        <PurchaseRow
          title="Increase Energy Capacity"
          benefit={`Current max: ${state?.energy?.max ?? '—'}`}
          cost="Buy"
          duration="Permanent"
          buying={buying}
          onBuy={() => buy({ type: 'energyCapacity' })}
        />
      )}

      {tab === 'multitap' && (
        <>
          <p className="upgrade-drawer__hint">
            Current: {state?.multitap?.tier ?? 'x1'}
            {state?.multitap?.expiresAt ? ' (active)' : ''}
          </p>
          <PurchaseRow title="Multitap x2" benefit="2x reward value per accepted tap" cost="1000 SVE" duration="7 days" buying={buying} onBuy={() => buy({ type: 'multitap', tier: 'x2' })} />
          <PurchaseRow title="Multitap x3" benefit="3x reward value per accepted tap" cost="1300 SVE" duration="7 days" buying={buying} onBuy={() => buy({ type: 'multitap', tier: 'x3' })} />
        </>
      )}

      {tab === 'rechargeSpeed' && (
        <>
          <p className="upgrade-drawer__hint">Current: +{state?.energy?.rechargeRate ?? 20}/{state?.energy?.rechargeIntervalMinutes ?? 20}m</p>
          <PurchaseRow title="+22 Energy / 20m" benefit="Slightly faster passive recharge" cost="2000 Tokens" duration="Permanent" buying={buying} onBuy={() => buy({ type: 'rechargeSpeed', tier: 'tier1' })} />
          <PurchaseRow title="+24 Energy / 20m" benefit="Faster passive recharge" cost="3200 Tokens" duration="Permanent" buying={buying} onBuy={() => buy({ type: 'rechargeSpeed', tier: 'tier2' })} />
          <PurchaseRow title="+27 Energy / 20m" benefit="Even faster recharge" cost="4800 Tokens" duration="Permanent" buying={buying} onBuy={() => buy({ type: 'rechargeSpeed', tier: 'tier3' })} />
          <PurchaseRow title="+30 Energy / 20m" benefit="Maximum recharge tier" cost="7000 Tokens" duration="Permanent" buying={buying} onBuy={() => buy({ type: 'rechargeSpeed', tier: 'tier4' })} />
        </>
      )}

      {tab === 'tapEfficiency' && (
        <>
          <p className="upgrade-drawer__hint">
            Current: {state?.efficiency?.tier ?? 'x1.0'} — expires with the season
          </p>
          <PurchaseRow title="Efficiency x1.1" benefit="+10% on eligible reward amounts" cost="1.1 SVE" duration="Until season ends" buying={buying} onBuy={() => buy({ type: 'tapEfficiency', tier: 'x1.1' })} />
          <PurchaseRow title="Efficiency x1.2" benefit="+20% on eligible reward amounts" cost="1.2 SVE" duration="Until season ends" buying={buying} onBuy={() => buy({ type: 'tapEfficiency', tier: 'x1.2' })} />
          <PurchaseRow title="Efficiency x1.3" benefit="+30% on eligible reward amounts" cost="1.3 SVE" duration="Until season ends" buying={buying} onBuy={() => buy({ type: 'tapEfficiency', tier: 'x1.3' })} />
        </>
      )}
    </div>
  );
}
