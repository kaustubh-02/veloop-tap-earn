import { useCallback, useEffect, useRef, useState } from 'react';
import { tapApi } from '../api/endpoints';

/**
 * Central data hook for the Tap & Earn screen. Loads authoritative state
 * from the backend on mount, exposes a sendTap() action that optimistically
 * animates but never optimistically credits currency (spec 26: "Use
 * optimistic animation only; never optimistically add authoritative
 * currency to the balance"), and reconciles with the server response.
 */
export function useTapEarn() {
  const [state, setState] = useState(null);
  const [balances, setBalances] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastReward, setLastReward] = useState(null);
  const [rejection, setRejection] = useState(null);
  const [luckyReady, setLuckyReady] = useState(false);
  const inFlightRef = useRef(false);
  const lastLocalTapAtRef = useRef(0);

  const refresh = useCallback(async () => {
    try {
      const data = await tapApi.getState();
      setState(data.state);
      setBalances(data.balances);
      setError(null);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to load Tap & Earn state');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const sendTap = useCallback(async ({ precisionTapHit = false } = {}) => {
    const now = Date.now();
    // Client-side 200ms lock mirrors the server rule so the UI never even
    // attempts a tap that would be rejected (spec 3: "Do not accept
    // another tap event locally until the 200ms interaction window is
    // respected"). The server re-validates independently regardless.
    if (now - lastLocalTapAtRef.current < 200) {
      return { locked: true };
    }
    if (inFlightRef.current) {
      return { locked: true };
    }
    lastLocalTapAtRef.current = now;
    inFlightRef.current = true;

    try {
      const { requestId } = await tapApi.getRequestId();
      const result = await tapApi.sendTap({ requestId, clientSentAt: new Date().toISOString(), precisionTapHit });

      setState(result.state);
      setBalances(result.balances);
      setLastReward({
        type: result.reward.type,
        amount: result.reward.amount,
        mystery: result.mystery,
        precision: result.precision,
        id: requestId,
      });
      setRejection(null);
      if (result.luckyTapEligible) setLuckyReady(true);

      return { status: 'accepted', result };
    } catch (err) {
      const code = err?.response?.data?.error;
      const messageMap = {
        too_fast: 'Too fast',
        energy_empty: 'Energy empty',
        suspicious_pattern: 'Slow down',
        cooldown_active: 'Cooldown active',
      };
      setRejection(messageMap[code] || 'Tap rejected');
      return { status: 'rejected', code };
    } finally {
      inFlightRef.current = false;
    }
  }, []);

  return { state, balances, loading, error, lastReward, rejection, luckyReady, setLuckyReady, refresh, sendTap };
}
