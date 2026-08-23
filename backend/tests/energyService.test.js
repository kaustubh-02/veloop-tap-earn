const energyService = require('../services/energyService');

describe('energyService.regenerateEnergy', () => {
  const baseConfig = { energy: { rechargeAmount: 20, rechargeIntervalMinutes: 20 } };

  test('does not regenerate before one full interval has elapsed', () => {
    const now = new Date('2026-01-01T00:10:00Z'); // 10 min elapsed
    const tapState = {
      energy: 480,
      maxEnergy: 500,
      rechargeRate: 20,
      rechargeIntervalMinutes: 20,
      lastEnergyAt: new Date('2026-01-01T00:00:00Z'),
    };
    const result = energyService.regenerateEnergy(tapState, now);
    expect(result.energy).toBe(480);
  });

  test('regenerates exactly one tick after 20 minutes', () => {
    const now = new Date('2026-01-01T00:20:00Z');
    const tapState = {
      energy: 480,
      maxEnergy: 500,
      rechargeRate: 20,
      rechargeIntervalMinutes: 20,
      lastEnergyAt: new Date('2026-01-01T00:00:00Z'),
    };
    const result = energyService.regenerateEnergy(tapState, now);
    expect(result.energy).toBe(500);
  });

  test('regenerates multiple ticks after a long offline period', () => {
    const now = new Date('2026-01-01T02:00:00Z'); // 2 hours = 6 ticks of 20 min
    const tapState = {
      energy: 0,
      maxEnergy: 500,
      rechargeRate: 20,
      rechargeIntervalMinutes: 20,
      lastEnergyAt: new Date('2026-01-01T00:00:00Z'),
    };
    const result = energyService.regenerateEnergy(tapState, now);
    // 6 ticks * 20 = 120, well under cap
    expect(result.energy).toBe(120);
  });

  test('never exceeds maxEnergy cap even after a very long offline period', () => {
    const now = new Date('2026-01-05T00:00:00Z'); // 4 days offline
    const tapState = {
      energy: 0,
      maxEnergy: 500,
      rechargeRate: 20,
      rechargeIntervalMinutes: 20,
      lastEnergyAt: new Date('2026-01-01T00:00:00Z'),
    };
    const result = energyService.regenerateEnergy(tapState, now);
    expect(result.energy).toBe(500);
  });

  test('is a no-op once already at max energy', () => {
    const now = new Date('2026-01-01T01:00:00Z');
    const tapState = {
      energy: 500,
      maxEnergy: 500,
      rechargeRate: 20,
      rechargeIntervalMinutes: 20,
      lastEnergyAt: new Date('2026-01-01T00:00:00Z'),
    };
    const result = energyService.regenerateEnergy(tapState, now);
    expect(result.energy).toBe(500);
  });
});

describe('energyService.isShieldActive / isShieldOnCooldown', () => {
  test('shield is active strictly before expiresAt', () => {
    const now = new Date('2026-01-01T00:00:10Z');
    const activeShield = { startedAt: new Date('2026-01-01T00:00:00Z'), expiresAt: new Date('2026-01-01T00:00:30Z') };
    expect(energyService.isShieldActive(activeShield, now)).toBe(true);
  });

  test('shield is inactive once past expiresAt', () => {
    const now = new Date('2026-01-01T00:00:31Z');
    const activeShield = { startedAt: new Date('2026-01-01T00:00:00Z'), expiresAt: new Date('2026-01-01T00:00:30Z') };
    expect(energyService.isShieldActive(activeShield, now)).toBe(false);
  });

  test('shield is on cooldown between expiry and cooldownUntil', () => {
    const now = new Date('2026-01-01T00:02:00Z');
    const activeShield = {
      expiresAt: new Date('2026-01-01T00:00:30Z'),
      cooldownUntil: new Date('2026-01-01T00:05:30Z'),
    };
    expect(energyService.isShieldOnCooldown(activeShield, now)).toBe(true);
  });
});
