import React, { useEffect, useState } from 'react';
import { tapApi } from '../api/endpoints';
import './LuckyTapModal.css';

/**
 * Shows clear progress toward the 300-tap threshold without implying a
 * guaranteed reward before eligibility (spec 14: "do not display a
 * misleading 'almost lucky' state"). Once eligible, the spin result is
 * always server-generated before being revealed (spec 41.12).
 */
export default function LuckyTapModal({ onSpun }) {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await tapApi.getLuckyStatus();
      setStatus(data);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to load Lucky Tap status');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const spin = async () => {
    setSpinning(true);
    setError(null);
    setResult(null);
    try {
      const requestId = crypto.randomUUID();
      const data = await tapApi.spin(requestId);
      // Small delay purely for the wheel animation; the result itself is
      // already final from the server response.
      setTimeout(() => {
        setResult(data.spin);
        setSpinning(false);
        load();
        if (onSpun) onSpun();
      }, 900);
    } catch (err) {
      setError(err?.response?.data?.message || 'Spin failed');
      setSpinning(false);
    }
  };

  if (loading) return <div className="mission-panel__loading">Loading…</div>;

  const pct = status ? Math.min(100, Math.round((status.progress / status.threshold) * 100)) : 0;

  return (
    <div className="lucky-modal">
      <div className={`lucky-modal__wheel ${spinning ? 'lucky-modal__wheel--spinning' : ''}`}>🎡</div>

      {error && <div className="feature-modal__error">{error}</div>}

      {result && (
        <div className="lucky-modal__result">
          {result.resultType === 'better_luck' ? 'Better luck next time!' : `You won ${result.resultAmount} ${result.resultType}`}
        </div>
      )}

      {status?.eligible ? (
        <button type="button" className="lucky-modal__spin-btn" onClick={spin} disabled={spinning}>
          {spinning ? 'Spinning…' : 'Spin Now'}
        </button>
      ) : (
        <div className="lucky-modal__progress">
          <div className="lucky-modal__progress-label">
            Progress toward Lucky Tap: {status?.progress ?? 0} / {status?.threshold ?? 300}
          </div>
          <div className="mission-row__track">
            <div className="mission-row__fill" style={{ width: `${pct}%` }} />
          </div>
          <p className="feature-modal__note">Keep tapping — Lucky Tap unlocks automatically once you're eligible.</p>
        </div>
      )}
    </div>
  );
}
