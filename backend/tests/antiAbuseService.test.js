const antiAbuseService = require('../services/antiAbuseService');

const config = {
  security: {
    minTapIntervalMs: 200,
    burstWindowMs: 10000,
    burstMaxTapsInWindow: 45,
    identicalIntervalStrikeThreshold: 8,
    identicalIntervalToleranceMs: 3,
    maxStrikesBeforeTempBlock: 5,
    tempBlockMinutes: 10,
  },
};

describe('antiAbuseService.validateTapTiming — 200ms rule', () => {
  test('rejects a tap sent 199ms after the last accepted tap', () => {
    const now = new Date('2026-01-01T00:00:00.199Z');
    const lastAcceptedTapAt = new Date('2026-01-01T00:00:00.000Z');
    const result = antiAbuseService.validateTapTiming({ lastAcceptedTapAt, recentTapTimestamps: [], now, config });
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('too_fast');
  });

  test('accepts a tap sent exactly 200ms after the last accepted tap', () => {
    const now = new Date('2026-01-01T00:00:00.200Z');
    const lastAcceptedTapAt = new Date('2026-01-01T00:00:00.000Z');
    const result = antiAbuseService.validateTapTiming({ lastAcceptedTapAt, recentTapTimestamps: [], now, config });
    expect(result.allowed).toBe(true);
  });

  test('accepts the very first tap with no prior lastAcceptedTapAt', () => {
    const now = new Date();
    const result = antiAbuseService.validateTapTiming({ lastAcceptedTapAt: null, recentTapTimestamps: [], now, config });
    expect(result.allowed).toBe(true);
  });
});

describe('antiAbuseService.validateTapTiming — burst detection', () => {
  test('rejects when too many taps already occurred within the burst window', () => {
    const now = new Date('2026-01-01T00:00:10Z');
    const recentTapTimestamps = Array.from({ length: 45 }, (_, i) => new Date(now.getTime() - i * 200));
    const result = antiAbuseService.validateTapTiming({
      lastAcceptedTapAt: new Date(now.getTime() - 200),
      recentTapTimestamps,
      now,
      config,
    });
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('suspicious_pattern');
  });
});

describe('antiAbuseService.validateTapTiming — identical interval detection', () => {
  test('flags a long run of near-identical deltas as suspicious', () => {
    const start = new Date('2026-01-01T00:00:00Z').getTime();
    const recentTapTimestamps = Array.from({ length: 8 }, (_, i) => new Date(start + i * 200));
    const now = new Date(start + 8 * 200);
    const result = antiAbuseService.validateTapTiming({
      lastAcceptedTapAt: recentTapTimestamps[recentTapTimestamps.length - 1],
      recentTapTimestamps,
      now,
      config,
    });
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('suspicious_pattern');
  });

  test('allows naturally varying human-like tap intervals', () => {
    const start = new Date('2026-01-01T00:00:00Z').getTime();
    const deltas = [210, 340, 205, 500, 260, 220, 900, 215];
    let t = start;
    const recentTapTimestamps = [new Date(t)];
    for (const d of deltas) {
      t += d;
      recentTapTimestamps.push(new Date(t));
    }
    const now = new Date(t + 250);
    const result = antiAbuseService.validateTapTiming({
      lastAcceptedTapAt: recentTapTimestamps[recentTapTimestamps.length - 1],
      recentTapTimestamps,
      now,
      config,
    });
    expect(result.allowed).toBe(true);
  });
});

describe('antiAbuseService.registerStrike', () => {
  test('temp-blocks and resets counter once threshold is reached', () => {
    const now = new Date('2026-01-01T00:00:00Z');
    const result = antiAbuseService.registerStrike({ suspiciousStrikeCount: 4, config, now });
    expect(result.suspiciousStrikeCount).toBe(0);
    expect(result.blockedUntil).not.toBeNull();
    expect(result.blockedUntil.getTime()).toBe(now.getTime() + 10 * 60 * 1000);
  });

  test('increments without blocking below threshold', () => {
    const now = new Date();
    const result = antiAbuseService.registerStrike({ suspiciousStrikeCount: 1, config, now });
    expect(result.suspiciousStrikeCount).toBe(2);
    expect(result.blockedUntil).toBeNull();
  });
});
