import React, { useEffect, useState } from 'react';

/**
 * Reusable countdown display. Server timestamps are authoritative — this
 * component only re-renders the remaining time locally between refreshes;
 * it never invents its own expiry logic.
 */
export default function Countdown({ expiresAt, onExpire, format = 'auto', className = '' }) {
  const [remainingMs, setRemainingMs] = useState(() => computeRemaining(expiresAt));

  useEffect(() => {
    setRemainingMs(computeRemaining(expiresAt));
    if (!expiresAt) return undefined;

    const interval = setInterval(() => {
      const rem = computeRemaining(expiresAt);
      setRemainingMs(rem);
      if (rem <= 0) {
        clearInterval(interval);
        if (onExpire) onExpire();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [expiresAt, onExpire]);

  if (!expiresAt || remainingMs <= 0) return null;

  return <span className={className}>{formatDuration(remainingMs, format)}</span>;
}

function computeRemaining(expiresAt) {
  if (!expiresAt) return 0;
  return new Date(expiresAt).getTime() - Date.now();
}

function formatDuration(ms, format) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (format === 'seconds') {
    return `${seconds}s`;
  }
  if (days > 0) {
    return `${days}d ${hours}h`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds.toString().padStart(2, '0')}s`;
  }
  return `${seconds}s`;
}
