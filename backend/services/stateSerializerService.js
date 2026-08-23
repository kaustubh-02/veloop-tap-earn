const { TapState } = require('../models');
const energyService = require('./energyService');
const upgradeStateService = require('./upgradeStateService');
const seasonService = require('./seasonService');
const rewardLedgerService = require('./rewardLedgerService');

/**
 * Builds the full authoritative state payload for GET /api/tap/state.
 * Reconciles energy/bank/multiplier/efficiency/boost from timestamps
 * before returning, so the frontend never has to guess or extrapolate.
 */
async function buildStatePayload(userId, config) {
  const tapState = await TapState.findOne({ userId });
  if (!tapState) throw new Error('tap_state_missing');

  const now = new Date();
  const activeSeason = await seasonService.getActiveSeasonCached();

  const regen = energyService.regenerateEnergy(tapState, now);
  const bankRegen = energyService.regenerateEnergyBank(tapState.energyBank, config, now);
  const multitap = upgradeStateService.resolveMultitap(tapState, now);
  const efficiency = upgradeStateService.resolveEfficiency(tapState, activeSeason, now);
  const boost = upgradeStateService.resolveBoost(tapState, now);
  const streakCombo = upgradeStateService.resolveStreakAndCombo(tapState, config, now);

  // Persist any reconciliation drift (e.g. energy regenerated since last tap,
  // or a multiplier that just expired) so subsequent reads are consistent.
  let dirty = false;
  if (regen.energy !== tapState.energy) {
    tapState.energy = regen.energy;
    tapState.lastEnergyAt = regen.lastEnergyAt;
    dirty = true;
  }
  if (JSON.stringify(bankRegen) !== JSON.stringify(tapState.energyBank)) {
    tapState.energyBank = bankRegen;
    dirty = true;
  }
  if (multitap.tapMultiplier !== tapState.tapMultiplier) {
    Object.assign(tapState, multitap);
    dirty = true;
  }
  if (efficiency.efficiency !== tapState.efficiency) {
    Object.assign(tapState, efficiency);
    dirty = true;
  }
  if (streakCombo.streakCount !== tapState.streakCount || streakCombo.comboCount !== tapState.comboCount) {
    tapState.streakCount = streakCombo.streakCount;
    tapState.comboCount = streakCombo.comboCount;
    dirty = true;
  }
  if (dirty) await tapState.save();

  const shieldActive = energyService.isShieldActive(tapState.activeShield, now);
  const shieldOnCooldown = energyService.isShieldOnCooldown(tapState.activeShield, now);

  return {
    energy: {
      current: tapState.energy,
      max: tapState.maxEnergy,
      rechargeRate: tapState.rechargeRate,
      rechargeIntervalMinutes: tapState.rechargeIntervalMinutes,
      nextRechargeAt: nextRechargeTimestamp(tapState),
    },
    energyBank: bankRegen.expiresAt
      ? {
          active: true,
          capacity: bankRegen.capacity,
          current: bankRegen.current,
          expiresAt: bankRegen.expiresAt,
          purchaseCount: bankRegen.purchaseCount,
        }
      : { active: false },
    shield: {
      active: shieldActive,
      expiresAt: shieldActive ? tapState.activeShield.expiresAt : null,
      onCooldown: shieldOnCooldown,
      cooldownUntil: shieldOnCooldown ? tapState.activeShield.cooldownUntil : null,
    },
    multitap: {
      tier: multitap.multiplierTier,
      multiplier: multitap.tapMultiplier,
      expiresAt: multitap.multiplierExpiresAt,
    },
    efficiency: {
      tier: efficiency.efficiencyTier,
      multiplier: efficiency.efficiency,
      expiresAt: efficiency.efficiencyExpiresAt,
    },
    boost: {
      active: boost.isActive,
      multiplier: boost.multiplier,
      startedAt: boost.startedAt,
      expiresAt: boost.expiresAt,
    },
    streak: { count: streakCombo.streakCount },
    combo: { count: streakCombo.comboCount },
    luckyTap: {
      eligible: tapState.luckyEligible,
      progress: Math.min(tapState.tapsSinceLastLuckyWindow, config.luckyTap.minAcceptedTaps),
      threshold: config.luckyTap.minAcceptedTaps,
    },
    mysteryTap: {
      progress: tapState.tapsSinceLastMysteryRoll,
      milestone: config.mysteryTap.everyEffectiveTaps,
    },
    lifetime: {
      physicalTaps: tapState.physicalTapCountLifetime,
      effectiveTaps: tapState.effectiveTapCountLifetime,
    },
    season: activeSeason
      ? {
          seasonId: activeSeason.seasonId,
          name: activeSeason.name,
          startAt: activeSeason.startAt,
          endAt: activeSeason.endAt,
        }
      : null,
    stateVersion: tapState.stateVersion,
  };
}

function nextRechargeTimestamp(tapState) {
  if (tapState.energy >= tapState.maxEnergy) return null;
  const intervalMs = tapState.rechargeIntervalMinutes * 60 * 1000;
  return new Date(new Date(tapState.lastEnergyAt).getTime() + intervalMs);
}

async function buildBalancesPayload(user) {
  return {
    ve: rewardLedgerService.decimalToNumber(user.balances.ve),
    sve: rewardLedgerService.decimalToNumber(user.balances.sve),
    tokens: user.balances.tokens,
    gems: rewardLedgerService.decimalToNumber(user.balances.gems),
    spins: user.balances.spins,
    fragments: user.balances.fragments,
  };
}

module.exports = { buildStatePayload, buildBalancesPayload };
