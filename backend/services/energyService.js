const economyConfigService = require('./economyConfigService');

/**
 * Pure/stateless energy math. Given a TapState-shaped object and "now",
 * computes regenerated energy purely from elapsed time — no periodic job
 * required (spec 5: "must be calculated from timestamps rather than
 * requiring a request every 20 minutes").
 *
 * Callers are responsible for persisting the returned values back onto
 * the TapState document (this module never touches the DB directly, so
 * it stays trivially unit-testable).
 */

/**
 * Regenerates normal energy from elapsed time since lastEnergyAt.
 * Never exceeds maxEnergy (spec: "Regenerated energy can never exceed
 * maximum storage capacity").
 */
function regenerateEnergy(tapState, now = new Date()) {
  const { energy, maxEnergy, rechargeRate, rechargeIntervalMinutes, lastEnergyAt } = tapState;

  if (energy >= maxEnergy) {
    return { energy: maxEnergy, lastEnergyAt: now };
  }

  const elapsedMs = now.getTime() - new Date(lastEnergyAt).getTime();
  if (elapsedMs <= 0) {
    return { energy, lastEnergyAt };
  }

  const intervalMs = rechargeIntervalMinutes * 60 * 1000;
  const ticksElapsed = Math.floor(elapsedMs / intervalMs);

  if (ticksElapsed <= 0) {
    return { energy, lastEnergyAt };
  }

  const regenerated = ticksElapsed * rechargeRate;
  const newEnergy = Math.min(maxEnergy, energy + regenerated);
  // Advance lastEnergyAt only by the whole ticks consumed, preserving the
  // remainder so partial progress toward the next tick isn't lost/reset.
  const newLastEnergyAt = new Date(new Date(lastEnergyAt).getTime() + ticksElapsed * intervalMs);

  return { energy: newEnergy, lastEnergyAt: newLastEnergyAt };
}

/**
 * Regenerates Energy Bank capacity from elapsed time (separate, slower
 * recharge per spec 41.7: +20 every 120 minutes), and expires the bank
 * entirely (remaining Bank Energy is lost) once past expiresAt.
 */
function regenerateEnergyBank(energyBank, config, now = new Date()) {
  if (!energyBank || !energyBank.expiresAt) {
    return { capacity: 0, current: 0, purchaseCount: 0, activatedAt: null, expiresAt: null, lastRechargeAt: null };
  }

  if (now.getTime() >= new Date(energyBank.expiresAt).getTime()) {
    // Expired: remaining Bank Energy is lost (spec 41.7).
    return { capacity: 0, current: 0, purchaseCount: 0, activatedAt: null, expiresAt: null, lastRechargeAt: null };
  }

  const { rechargeAmount, rechargeIntervalMinutes } = config.energyBank;
  const intervalMs = rechargeIntervalMinutes * 60 * 1000;
  const lastRecharge = energyBank.lastRechargeAt ? new Date(energyBank.lastRechargeAt) : new Date(energyBank.activatedAt);
  const elapsedMs = now.getTime() - lastRecharge.getTime();
  const ticks = Math.floor(elapsedMs / intervalMs);

  if (ticks <= 0 || energyBank.current >= energyBank.capacity) {
    return energyBank;
  }

  const newCurrent = Math.min(energyBank.capacity, energyBank.current + ticks * rechargeAmount);
  const newLastRechargeAt = new Date(lastRecharge.getTime() + ticks * intervalMs);

  return { ...energyBank, current: newCurrent, lastRechargeAt: newLastRechargeAt };
}

/**
 * Determines whether a shield is currently active and whether it has
 * expired (server timestamps are authoritative, never trust the client).
 */
function isShieldActive(activeShield, now = new Date()) {
  if (!activeShield || !activeShield.expiresAt) return false;
  return now.getTime() < new Date(activeShield.expiresAt).getTime();
}

function isShieldOnCooldown(activeShield, now = new Date()) {
  if (!activeShield || !activeShield.cooldownUntil) return false;
  return now.getTime() < new Date(activeShield.cooldownUntil).getTime();
}

/**
 * Given the amount of energy a tap would normally consume, resolves how
 * much comes from: shield-free (spec 41.8: 90% chance protected while
 * shield active), then Energy Bank (priority before normal energy per
 * spec 41.7), then normal energy. Returns updated pools + the "source"
 * label used for TapEvent auditing.
 *
 * NOTE: the 90%/10% shield outcome is a SERVER-SIDE random roll — the
 * client never decides which taps are protected (spec 41.8).
 */
function resolveEnergyConsumption({ effectiveCost, energy, energyBank, activeShield, config, now, rng = Math.random }) {
  let source = 'normal';
  let shieldProtected = false;

  if (isShieldActive(activeShield, now)) {
    const roll = rng();
    if (roll < config.energyShield.protectionRate) {
      shieldProtected = true;
      source = 'shield_free';
    }
  }

  if (shieldProtected) {
    return { energyAfter: energy, bankAfter: energyBank, source, cost: 0 };
  }

  // Energy Bank consumed before normal energy (spec 41.7).
  if (energyBank && energyBank.current > 0) {
    const fromBank = Math.min(energyBank.current, effectiveCost);
    const remainder = effectiveCost - fromBank;
    const bankAfter = { ...energyBank, current: energyBank.current - fromBank };
    const energyAfter = Math.max(0, energy - remainder);
    return {
      energyAfter,
      bankAfter,
      source: fromBank > 0 ? 'bank' : 'normal',
      cost: effectiveCost,
    };
  }

  return { energyAfter: Math.max(0, energy - effectiveCost), bankAfter: energyBank, source: 'normal', cost: effectiveCost };
}

function hasEnoughEnergy({ effectiveCost, energy, energyBank, activeShield, config, now }) {
  if (isShieldActive(activeShield, now)) {
    // Even a shielded tap that rolls "charged" still needs available energy
    // (bank+normal combined) as a fallback; shield only affects the roll
    // odds, not whether energy is required at all.
  }
  const bankAvailable = energyBank && energyBank.current > 0 ? energyBank.current : 0;
  return energy + bankAvailable >= effectiveCost;
}

module.exports = {
  regenerateEnergy,
  regenerateEnergyBank,
  isShieldActive,
  isShieldOnCooldown,
  resolveEnergyConsumption,
  hasEnoughEnergy,
};
