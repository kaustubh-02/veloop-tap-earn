import React, { useEffect, useState } from 'react';
import { tapApi } from '../api/endpoints';
import './MissionPanel.css';

export default function DailyChallengeCard({ onClaimed }) {
  const [daily, setDaily] = useState(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [error, setError] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await tapApi.getDailyChallenge();
      setDaily(data.dailyChallenge);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to load daily challenge');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const claim = async () => {
    setClaiming(true);
    setError(null);
    try {
      await tapApi.claimDailyChallenge();
      await load();
      if (onClaimed) onClaimed();
    } catch (err) {
      setError(err?.response?.data?.message || 'Claim failed');
    } finally {
      setClaiming(false);
    }
  };

  if (loading) return <div className="mission-panel__loading">Loading…</div>;
  if (error) return <div className="mission-panel__error">{error}</div>;
  if (!daily) return <div className="mission-panel__empty">No daily challenge available yet.</div>;

  const pct = Math.min(100, Math.round((daily.progress / daily.target) * 100));

  return (
    <div className="mission-row">
      <div className="mission-row__info">
        <div className="mission-row__title">{daily.title}</div>
        <div className="mission-row__track">
          <div className="mission-row__fill" style={{ width: `${pct}%` }} />
        </div>
        <div className="mission-row__progress">
          {daily.progress} / {daily.target} accepted taps
        </div>
      </div>
      <button type="button" className="mission-row__cta" disabled={!daily.completed || daily.claimed || claiming} onClick={claim}>
        {daily.claimed ? 'Claimed' : daily.completed ? (claiming ? '...' : 'Claim') : 'In progress'}
      </button>
    </div>
  );
}
