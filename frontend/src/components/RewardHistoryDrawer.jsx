import React, { useEffect, useState } from 'react';
import { tapApi } from '../api/endpoints';
import './RewardHistoryDrawer.css';

export default function RewardHistoryDrawer() {
  const [ledger, setLedger] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    tapApi
      .getHistory(30)
      .then((data) => setLedger(data.ledger))
      .catch((err) => setError(err?.response?.data?.message || 'Failed to load history'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="mission-panel__loading">Loading…</div>;
  if (error) return <div className="mission-panel__error">{error}</div>;
  if (ledger.length === 0) return <div className="mission-panel__empty">No reward history yet — start tapping!</div>;

  return (
    <div className="history-list">
      {ledger.map((entry) => (
        <div key={entry._id} className="history-row">
          <span className={`history-row__dot history-row__dot--${entry.direction}`} />
          <div className="history-row__info">
            <div className="history-row__source">{formatSource(entry.source)}</div>
            <div className="history-row__time">{new Date(entry.createdAt).toLocaleString()}</div>
          </div>
          <div className={`history-row__amount history-row__amount--${entry.direction}`}>
            {entry.direction === 'credit' ? '+' : '-'}
            {parseFloat(entry.amount.toString())} {entry.currency.toUpperCase()}
          </div>
        </div>
      ))}
    </div>
  );
}

function formatSource(source) {
  return source
    .split('_')
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(' ');
}
