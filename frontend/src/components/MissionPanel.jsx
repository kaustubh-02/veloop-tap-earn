import React, { useEffect, useState } from 'react';
import { tapApi } from '../api/endpoints';
import './MissionPanel.css';

export default function MissionPanel({ onClaimed }) {
  const [missions, setMissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [claimingId, setClaimingId] = useState(null);
  const [error, setError] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await tapApi.getMissions();
      setMissions(data.missions);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to load missions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const claim = async (id) => {
    setClaimingId(id);
    setError(null);
    try {
      await tapApi.claimMission(id);
      await load();
      if (onClaimed) onClaimed();
    } catch (err) {
      setError(err?.response?.data?.message || 'Claim failed');
    } finally {
      setClaimingId(null);
    }
  };

  if (loading) return <div className="mission-panel__loading">Loading missions…</div>;
  if (error) return <div className="mission-panel__error">{error}</div>;
  if (missions.length === 0) return <div className="mission-panel__empty">No active missions right now. Check back soon.</div>;

  return (
    <div className="mission-panel">
      {missions.map((m) => {
        const pct = Math.min(100, Math.round((m.progress / m.target) * 100));
        return (
          <div key={m._id} className="mission-row">
            <div className="mission-row__info">
              <div className="mission-row__title">{m.title}</div>
              <div className="mission-row__track">
                <div className="mission-row__fill" style={{ width: `${pct}%` }} />
              </div>
              <div className="mission-row__progress">
                {m.progress} / {m.target}
              </div>
            </div>
            <button
              type="button"
              className="mission-row__cta"
              disabled={!m.completed || m.claimed || claimingId === m._id}
              onClick={() => claim(m._id)}
            >
              {m.claimed ? 'Claimed' : m.completed ? (claimingId === m._id ? '...' : 'Claim') : 'In progress'}
            </button>
          </div>
        );
      })}
    </div>
  );
}
