/**
 * antiAbuseService implements spec section 31: the 200ms interval is NOT
 * the only anti-bot mechanism. This module inspects server-side timing
 * history to reject impossible tap rates and suspicious sequences.
 *
 * All checks are pure functions over TapState fields so they're easy to
 * unit test without a DB.
 */

const ROLLING_WINDOW_SIZE = 50; // how many recent tap timestamps we retain

/**
 * Returns { allowed: boolean, reason: string|null }.
 * Reasons map to user-facing subtle messages: 'too_fast' | 'cooldown_active'
 * | 'suspicious_pattern' | null.
 */
function validateTapTiming({ lastAcceptedTapAt, recentTapTimestamps, now, config }) {
  const { minTapIntervalMs, burstWindowMs, burstMaxTapsInWindow, identicalIntervalStrikeThreshold, identicalIntervalToleranceMs } =
    config.security;

  // 1) Hard 200ms floor since last accepted tap.
  if (lastAcceptedTapAt) {
    const delta = now.getTime() - new Date(lastAcceptedTapAt).getTime();
    if (delta < minTapIntervalMs) {
      return { allowed: false, reason: 'too_fast' };
    }
  }

  // 2) Burst detection: too many accepted taps within a short rolling window.
  const windowStart = now.getTime() - burstWindowMs;
  const withinWindow = (recentTapTimestamps || []).filter((t) => new Date(t).getTime() >= windowStart);
  if (withinWindow.length >= burstMaxTapsInWindow) {
    return { allowed: false, reason: 'suspicious_pattern' };
  }

  // 3) Identical-interval detection: many consecutive taps with near-zero
  // variance in delta strongly suggests a script/auto-clicker rather than
  // a human finger.
  if ((recentTapTimestamps || []).length >= identicalIntervalStrikeThreshold) {
    const recent = [...recentTapTimestamps, now].slice(-identicalIntervalStrikeThreshold - 1);
    const deltas = [];
    for (let i = 1; i < recent.length; i += 1) {
      deltas.push(new Date(recent[i]).getTime() - new Date(recent[i - 1]).getTime());
    }
    const allNearIdentical = deltas.every((d) => Math.abs(d - deltas[0]) <= identicalIntervalToleranceMs);
    if (allNearIdentical) {
      return { allowed: false, reason: 'suspicious_pattern' };
    }
  }

  return { allowed: true, reason: null };
}

/**
 * Pushes `now` onto the rolling timestamp window, trimmed to a bounded
 * size so the TapState document never grows unbounded.
 */
function pushTapTimestamp(recentTapTimestamps, now) {
  const next = [...(recentTapTimestamps || []), now];
  if (next.length > ROLLING_WINDOW_SIZE) {
    return next.slice(next.length - ROLLING_WINDOW_SIZE);
  }
  return next;
}

/**
 * Strike bookkeeping: repeated suspicious patterns increment a counter;
 * beyond a threshold the account is temporarily soft-blocked. Returns the
 * new strike count and an optional blockedUntil timestamp.
 */
function registerStrike({ suspiciousStrikeCount, config, now }) {
  const nextCount = (suspiciousStrikeCount || 0) + 1;
  if (nextCount >= config.security.maxStrikesBeforeTempBlock) {
    const blockedUntil = new Date(now.getTime() + config.security.tempBlockMinutes * 60 * 1000);
    return { suspiciousStrikeCount: 0, blockedUntil };
  }
  return { suspiciousStrikeCount: nextCount, blockedUntil: null };
}

module.exports = {
  validateTapTiming,
  pushTapTimestamp,
  registerStrike,
};
