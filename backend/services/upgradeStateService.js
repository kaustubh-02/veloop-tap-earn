/**
 * upgradeStateService centralizes the logic for applying/expiring the
 * temporary multipliers that live denormalized on TapState (tapMultiplier,
 * efficiency) so the hot tap path doesn't need extra queries. The
 * Upgrade collection remains the durable purchase record / audit trail;
 * these helpers keep TapState in sync with it.
 */

/**
 * Falls back to the highest non-expired multiplier tier automatically
 * (spec section 7: "After expiry, the user automatically falls back to
 * the highest non-expired multiplier"). Since only one multitap purchase
 * can be active at a time in this v1 model (a new purchase replaces the
 * old expiry), this simply checks expiry and resets to x1 when expired.
 */
function resolveMultitap(tapState, now = new Date()) {
  if (tapState.multiplierExpiresAt && now.getTime() >= new Date(tapState.multiplierExpiresAt).getTime()) {
    return { tapMultiplier: 1, multiplierTier: 'x1', multiplierExpiresAt: null };
  }
  return {
    tapMultiplier: tapState.tapMultiplier,
    multiplierTier: tapState.multiplierTier,
    multiplierExpiresAt: tapState.multiplierExpiresAt,
  };
}

/**
 * Tap Efficiency expires at season end OR its own expiresAt, whichever is
 * sooner (spec 41.9: "expires when the current Tap Season expires").
 */
function resolveEfficiency(tapState, activeSeason, now = new Date()) {
  const efficiencyExpiresAt = tapState.efficiencyExpiresAt;
  const seasonEndsAt = activeSeason ? new Date(activeSeason.endAt) : null;

  const expired =
    (efficiencyExpiresAt && now.getTime() >= new Date(efficiencyExpiresAt).getTime()) ||
    (seasonEndsAt && now.getTime() >= seasonEndsAt.getTime());

  if (expired) {
    return { efficiency: 1, efficiencyTier: 'x1.0', efficiencyExpiresAt: null };
  }
  return {
    efficiency: tapState.efficiency,
    efficiencyTier: tapState.efficiencyTier,
    efficiencyExpiresAt: tapState.efficiencyExpiresAt,
  };
}

/**
 * Boost is a short 30s window; simply checks expiry.
 */
function resolveBoost(tapState, now = new Date()) {
  const { activeBoost } = tapState;
  if (!activeBoost || !activeBoost.expiresAt) {
    return { boostId: null, multiplier: 1, startedAt: null, expiresAt: null, isActive: false };
  }
  const isActive = now.getTime() < new Date(activeBoost.expiresAt).getTime();
  return {
    boostId: activeBoost.boostId,
    multiplier: isActive ? activeBoost.multiplier : 1,
    startedAt: activeBoost.startedAt,
    expiresAt: activeBoost.expiresAt,
    isActive,
  };
}

/**
 * Tap Streak resets after N seconds of inactivity (default 5s per 41.10).
 * Tap Combo resets after a shorter window (default 2s). Independent timers.
 */
function resolveStreakAndCombo(tapState, config, now = new Date()) {
  const streakResetMs = config.tapStreak.resetAfterSeconds * 1000;
  const comboResetMs = config.tapCombo.resetAfterSeconds * 1000;

  const streakBroken =
    tapState.lastStreakTapAt && now.getTime() - new Date(tapState.lastStreakTapAt).getTime() > streakResetMs;
  const comboBroken =
    tapState.lastComboTapAt && now.getTime() - new Date(tapState.lastComboTapAt).getTime() > comboResetMs;

  return {
    streakCount: streakBroken ? 0 : tapState.streakCount,
    comboCount: comboBroken ? 0 : tapState.comboCount,
  };
}

function findCapacityTier(currentMax, config) {
  return config.energy.capacityTiers.find((t) => t.from === currentMax);
}

function findMultitapTier(tierKey, config) {
  return config.multitap.tiers.find((t) => t.tier === tierKey);
}

function findEfficiencyTier(tierKey, config) {
  return config.tapEfficiency.tiers.find((t) => t.tier === tierKey);
}

function findRechargeSpeedTier(tierKey, config) {
  return config.rechargeSpeed.tiers.find((t) => t.tier === tierKey);
}

module.exports = {
  resolveMultitap,
  resolveEfficiency,
  resolveBoost,
  resolveStreakAndCombo,
  findCapacityTier,
  findMultitapTier,
  findEfficiencyTier,
  findRechargeSpeedTier,
};
