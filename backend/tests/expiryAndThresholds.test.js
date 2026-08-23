const upgradeStateService = require('../services/upgradeStateService');
const rewardRollService = require('../services/rewardRollService');
const defaultConfig = require('../config/tapEconomy.defaults');

describe('upgradeStateService.resolveMultitap — 7-day expiry', () => {
  test('keeps active multiplier before expiry', () => {
    const now = new Date('2026-01-08T00:00:00Z');
    const tapState = {
      tapMultiplier: 2,
      multiplierTier: 'x2',
      multiplierExpiresAt: new Date('2026-01-08T00:00:01Z'),
    };
    const result = upgradeStateService.resolveMultitap(tapState, now);
    expect(result.tapMultiplier).toBe(2);
  });

  test('falls back to x1 exactly at/after expiry', () => {
    const now = new Date('2026-01-08T00:00:01Z');
    const tapState = {
      tapMultiplier: 2,
      multiplierTier: 'x2',
      multiplierExpiresAt: new Date('2026-01-08T00:00:01Z'),
    };
    const result = upgradeStateService.resolveMultitap(tapState, now);
    expect(result.tapMultiplier).toBe(1);
    expect(result.multiplierTier).toBe('x1');
  });
});

describe('upgradeStateService.resolveEfficiency — expires at season end', () => {
  test('remains active while season has not ended', () => {
    const now = new Date('2026-01-15T00:00:00Z');
    const tapState = { efficiency: 1.2, efficiencyTier: 'x1.2', efficiencyExpiresAt: new Date('2026-01-30T00:00:00Z') };
    const season = { endAt: new Date('2026-01-30T00:00:00Z') };
    const result = upgradeStateService.resolveEfficiency(tapState, season, now);
    expect(result.efficiency).toBe(1.2);
  });

  test('expires once season has ended even if efficiencyExpiresAt has not passed', () => {
    const now = new Date('2026-01-30T00:00:01Z');
    const tapState = { efficiency: 1.2, efficiencyTier: 'x1.2', efficiencyExpiresAt: new Date('2026-02-01T00:00:00Z') };
    const season = { endAt: new Date('2026-01-30T00:00:00Z') };
    const result = upgradeStateService.resolveEfficiency(tapState, season, now);
    expect(result.efficiency).toBe(1);
    expect(result.efficiencyTier).toBe('x1.0');
  });
});

describe('upgradeStateService.resolveBoost — 30-second window', () => {
  test('is active within the 30s window', () => {
    const now = new Date('2026-01-01T00:00:15Z');
    const tapState = {
      activeBoost: { boostId: 'abc', multiplier: 2, startedAt: new Date('2026-01-01T00:00:00Z'), expiresAt: new Date('2026-01-01T00:00:30Z') },
    };
    const result = upgradeStateService.resolveBoost(tapState, now);
    expect(result.isActive).toBe(true);
    expect(result.multiplier).toBe(2);
  });

  test('expires after 30 seconds', () => {
    const now = new Date('2026-01-01T00:00:31Z');
    const tapState = {
      activeBoost: { boostId: 'abc', multiplier: 2, startedAt: new Date('2026-01-01T00:00:00Z'), expiresAt: new Date('2026-01-01T00:00:30Z') },
    };
    const result = upgradeStateService.resolveBoost(tapState, now);
    expect(result.isActive).toBe(false);
    expect(result.multiplier).toBe(1);
  });
});

describe('Lucky Tap threshold — 299 vs 300 accepted taps', () => {
  test('is not eligible at 299 accepted taps', () => {
    const luckyEligible = 299 >= defaultConfig.luckyTap.minAcceptedTaps;
    expect(luckyEligible).toBe(false);
  });

  test('becomes eligible at exactly 300 accepted taps', () => {
    const luckyEligible = 300 >= defaultConfig.luckyTap.minAcceptedTaps;
    expect(luckyEligible).toBe(true);
  });
});

describe('Mystery Tap milestone — every 250 effective taps', () => {
  test('triggers a roll exactly at the 250 milestone', () => {
    const counter = 250;
    expect(counter >= defaultConfig.mysteryTap.everyEffectiveTaps).toBe(true);
  });

  test('does not trigger before the milestone', () => {
    const counter = 249;
    expect(counter >= defaultConfig.mysteryTap.everyEffectiveTaps).toBe(false);
  });

  test('rollMysteryTapTrigger respects configured probability with injected rng', () => {
    const alwaysTrue = () => 0.001; // below 0.005 probability
    const alwaysFalse = () => 0.999;
    expect(rewardRollService.rollMysteryTapTrigger(defaultConfig, alwaysTrue)).toBe(true);
    expect(rewardRollService.rollMysteryTapTrigger(defaultConfig, alwaysFalse)).toBe(false);
  });
});
