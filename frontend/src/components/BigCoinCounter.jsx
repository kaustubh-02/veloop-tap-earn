import React, { useEffect, useRef, useState } from 'react';
import './BigCoinCounter.css';

/**
 * BigCoinCounter — the large, central VE total shown directly above the
 * Tap Circle (matching the "big number over the tap button" pattern from
 * the reference tap-to-earn concepts). This is purely a display of the
 * SAME authoritative balance already shown in BalanceCard — never a
 * separate source of truth — it just gives the number the visual weight
 * the hero interaction deserves. Animates a brief "count up" pulse
 * whenever the value increases so every tap feels rewarding to watch.
 */
export default function BigCoinCounter({ value }) {
  const [pulse, setPulse] = useState(false);
  const prevRef = useRef(value);

  useEffect(() => {
    if (value != null && prevRef.current != null && value > prevRef.current) {
      setPulse(true);
      const t = setTimeout(() => setPulse(false), 260);
      return () => clearTimeout(t);
    }
    prevRef.current = value;
    return undefined;
  }, [value]);

  useEffect(() => {
    prevRef.current = value;
  }, [value]);

  if (value == null) return null;

  return (
    <div className={`big-coin-counter ${pulse ? 'big-coin-counter--pulse' : ''}`}>
      <span className="big-coin-counter__icon">
        <span className="big-coin-counter__icon-inner">VE</span>
      </span>
      <span className="big-coin-counter__value">{formatBig(value)}</span>
    </div>
  );
}

function formatBig(n) {
  return n.toLocaleString('en-US', { maximumFractionDigits: 1 });
}
