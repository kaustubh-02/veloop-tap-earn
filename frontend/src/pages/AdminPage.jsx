import React, { useEffect, useState } from 'react';
import { adminApi } from '../api/endpoints';
import './AdminPage.css';

const TABS = ['Config', 'Analytics', 'Anti-Bot', 'Seasons', 'Ledger'];

/**
 * Minimal Admin Control Center covering spec section 43's required areas.
 * The full existing VELoop Admin Dashboard would embed this as a module;
 * this page is a self-contained implementation of the same admin API.
 */
export default function AdminPage() {
  const [tab, setTab] = useState('Config');

  return (
    <div className="admin-page page-enter">
      <header className="admin-page__header">
        <h1>Tap &amp; Earn Admin</h1>
        <nav className="admin-page__tabs">
          {TABS.map((t) => (
            <button key={t} type="button" className={`admin-page__tab ${tab === t ? 'admin-page__tab--active' : ''}`} onClick={() => setTab(t)}>
              {t}
            </button>
          ))}
        </nav>
      </header>

      <main className="admin-page__body">
        {tab === 'Config' && <ConfigPanel />}
        {tab === 'Analytics' && <AnalyticsPanel />}
        {tab === 'Anti-Bot' && <AntiBotPanel />}
        {tab === 'Seasons' && <SeasonsPanel />}
        {tab === 'Ledger' && <LedgerPanel />}
      </main>
    </div>
  );
}

function ConfigPanel() {
  const [config, setConfig] = useState(null);
  const [version, setVersion] = useState(null);
  const [raw, setRaw] = useState('');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  const load = async () => {
    const data = await adminApi.getConfig();
    setConfig(data.config);
    setVersion(data.version);
    setRaw(JSON.stringify(data.config, null, 2));
  };

  useEffect(() => {
    load();
  }, []);

  const save = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const parsed = JSON.parse(raw);
      const result = await adminApi.updateConfig(parsed, reason || 'admin dashboard edit');
      setVersion(result.version);
      setMessage(`Saved as version ${result.version}`);
    } catch (err) {
      setMessage(err?.response?.data?.message || err.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  if (!config) return <div className="admin-page__loading">Loading config…</div>;

  return (
    <div className="admin-panel">
      <p className="admin-panel__hint">
        Active version: <strong>{version}</strong>. Every field below is the single source of truth — the frontend and
        backend both read this document, so changes take effect immediately without a redeploy.
      </p>
      <textarea className="admin-panel__editor" value={raw} onChange={(e) => setRaw(e.target.value)} spellCheck={false} />
      <input
        className="admin-panel__reason"
        placeholder="Reason for this change (required, goes into the audit trail)"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
      />
      <button type="button" className="admin-panel__save" onClick={save} disabled={saving}>
        {saving ? 'Saving…' : 'Save Configuration'}
      </button>
      {message && <div className="admin-panel__message">{message}</div>}
    </div>
  );
}

function AnalyticsPanel() {
  const [taps, setTaps] = useState(null);
  const [rewards, setRewards] = useState(null);
  const [ads, setAds] = useState(null);

  useEffect(() => {
    adminApi.getTapAnalytics().then(setTaps);
    adminApi.getRewardAnalytics().then(setRewards);
    adminApi.getAdAnalytics().then(setAds);
  }, []);

  return (
    <div className="admin-panel">
      <h3>Tap Analytics (24h)</h3>
      {taps ? (
        <ul className="admin-panel__stat-list">
          <li>Accepted taps: {taps.last24h.totalAccepted}</li>
          <li>Physical taps: {taps.last24h.totalPhysical}</li>
          <li>Effective taps: {taps.last24h.totalEffective}</li>
          <li>Active tappers: {taps.activeTappers}</li>
        </ul>
      ) : (
        <div className="admin-page__loading">Loading…</div>
      )}

      <h3>Reward Issuance (24h)</h3>
      {rewards ? (
        <ul className="admin-panel__stat-list">
          {rewards.last24h.map((r, i) => (
            <li key={i}>
              {r._id.currency.toUpperCase()} via {r._id.source}: {r.totalAmount.toFixed(2)} ({r.count} events)
            </li>
          ))}
        </ul>
      ) : (
        <div className="admin-page__loading">Loading…</div>
      )}

      <h3>Ad Events (24h)</h3>
      {ads ? (
        <ul className="admin-panel__stat-list">
          {ads.last24h.map((a, i) => (
            <li key={i}>
              {a._id.placement} — {a._id.eventType}: {a.count}
            </li>
          ))}
        </ul>
      ) : (
        <div className="admin-page__loading">Loading…</div>
      )}
    </div>
  );
}

function AntiBotPanel() {
  const [flagged, setFlagged] = useState(null);

  useEffect(() => {
    adminApi.getAntiAbuseAnalytics().then((d) => setFlagged(d.flaggedUsers));
  }, []);

  if (!flagged) return <div className="admin-page__loading">Loading…</div>;
  if (flagged.length === 0) return <div className="admin-panel">No users currently flagged for suspicious tap patterns.</div>;

  return (
    <div className="admin-panel">
      <ul className="admin-panel__stat-list">
        {flagged.map((f) => (
          <li key={f._id}>
            {f.userId?.displayName || f.userId} — {f.suspiciousStrikeCount} strikes
          </li>
        ))}
      </ul>
    </div>
  );
}

function SeasonsPanel() {
  const [seasons, setSeasons] = useState(null);
  const [message, setMessage] = useState(null);

  const load = async () => {
    const data = await adminApi.getSeasons();
    setSeasons(data.seasons);
  };

  useEffect(() => {
    load();
  }, []);

  const rollover = async () => {
    const result = await adminApi.forceRollover();
    setMessage(result.status === 'ok' ? `Rolled over to ${result.newSeason.seasonId}` : result.message);
    load();
  };

  if (!seasons) return <div className="admin-page__loading">Loading…</div>;

  return (
    <div className="admin-panel">
      <button type="button" className="admin-panel__save" onClick={rollover}>
        Force Rollover Check
      </button>
      {message && <div className="admin-panel__message">{message}</div>}
      <ul className="admin-panel__stat-list">
        {seasons.map((s) => (
          <li key={s._id}>
            {s.name} — {s.status} ({new Date(s.startAt).toLocaleDateString()} → {new Date(s.endAt).toLocaleDateString()})
          </li>
        ))}
      </ul>
    </div>
  );
}

function LedgerPanel() {
  const [entries, setEntries] = useState(null);

  useEffect(() => {
    adminApi.getLedger({ limit: 50 }).then((d) => setEntries(d.entries));
  }, []);

  if (!entries) return <div className="admin-page__loading">Loading…</div>;

  return (
    <div className="admin-panel">
      <ul className="admin-panel__stat-list">
        {entries.map((e) => (
          <li key={e._id}>
            {e.userId?.displayName || e.userId} — {e.direction} {parseFloat(e.amount.toString())} {e.currency} ({e.source})
          </li>
        ))}
      </ul>
    </div>
  );
}
