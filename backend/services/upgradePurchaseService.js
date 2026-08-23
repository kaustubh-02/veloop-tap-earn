const { TapState, Upgrade } = require('../models');
const economyConfigService = require('./economyConfigService');
const rewardLedgerService = require('./rewardLedgerService');
const upgradeStateService = require('./upgradeStateService');
const seasonService = require('./seasonService');

/**
 * Purchases an Energy Capacity tier upgrade. Permanent (no expiry).
 * Pricing must increase faster than capacity (spec 6) — enforced simply
 * by following the configured tier ladder in order; a user can only move
 * to the next tier from their current maxEnergy.
 */
async function purchaseCapacityUpgrade({ userId }) {
  const { config, version: configVersion } = await economyConfigService.getConfig();
  const tapState = await TapState.findOne({ userId });
  if (!tapState) throw new Error('tap_state_missing');

  const tier = upgradeStateService.findCapacityTier(tapState.maxEnergy, config);
  if (!tier) throw new Error('no_further_capacity_tier_available');

  await rewardLedgerService.applyBalanceChange({
    userId,
    currency: tier.cost.currency,
    amount: tier.cost.amount,
    direction: 'debit',
    source: 'upgrade_purchase',
    referenceType: 'Upgrade',
    configVersion,
  });

  tapState.maxEnergy = tier.to;
  await tapState.save();

  const upgrade = await Upgrade.create({
    userId,
    type: 'energyCapacity',
    tier: String(tier.to),
    cost: tier.cost,
    expiresAt: null,
  });

  return { upgrade, newMaxEnergy: tier.to };
}

/**
 * Purchases a Multitap tier (x2 or x3). Temporary, valid 7 days from
 * activation (spec 7, 41.5). A new purchase replaces any existing
 * multiplier and resets the 7-day window.
 */
async function purchaseMultitapUpgrade({ userId, tier }) {
  const { config, version: configVersion } = await economyConfigService.getConfig();
  const tierDef = upgradeStateService.findMultitapTier(tier, config);
  if (!tierDef || !tierDef.cost) throw new Error('invalid_multitap_tier');

  const tapState = await TapState.findOne({ userId });
  if (!tapState) throw new Error('tap_state_missing');

  await rewardLedgerService.applyBalanceChange({
    userId,
    currency: tierDef.cost.currency,
    amount: tierDef.cost.amount,
    direction: 'debit',
    source: 'upgrade_purchase',
    referenceType: 'Upgrade',
    configVersion,
  });

  const now = new Date();
  const expiresAt = new Date(now.getTime() + tierDef.validityDays * 24 * 60 * 60 * 1000);

  tapState.tapMultiplier = tierDef.multiplier;
  tapState.multiplierTier = tierDef.tier;
  tapState.multiplierExpiresAt = expiresAt;
  await tapState.save();

  const upgrade = await Upgrade.create({
    userId,
    type: 'multitap',
    tier: tierDef.tier,
    cost: tierDef.cost,
    expiresAt,
  });

  return { upgrade, multiplierExpiresAt: expiresAt };
}

/**
 * Purchases a Recharge Speed tier. Permanent (no expiry) but bounded by
 * the configured tier ladder so recharge can never become unlimited
 * (spec 8).
 */
async function purchaseRechargeSpeedUpgrade({ userId, tier }) {
  const { config, version: configVersion } = await economyConfigService.getConfig();
  const tierDef = upgradeStateService.findRechargeSpeedTier(tier, config);
  if (!tierDef || !tierDef.cost) throw new Error('invalid_recharge_speed_tier');

  const tapState = await TapState.findOne({ userId });
  if (!tapState) throw new Error('tap_state_missing');

  await rewardLedgerService.applyBalanceChange({
    userId,
    currency: tierDef.cost.currency,
    amount: tierDef.cost.amount,
    direction: 'debit',
    source: 'upgrade_purchase',
    referenceType: 'Upgrade',
    configVersion,
  });

  tapState.rechargeRate = tierDef.amount;
  tapState.rechargeIntervalMinutes = tierDef.intervalMinutes;
  tapState.rechargeSpeedTier = tierDef.tier;
  await tapState.save();

  const upgrade = await Upgrade.create({
    userId,
    type: 'rechargeSpeed',
    tier: tierDef.tier,
    cost: tierDef.cost,
    expiresAt: null,
  });

  return { upgrade, rechargeRate: tierDef.amount, rechargeIntervalMinutes: tierDef.intervalMinutes };
}

/**
 * Purchases a Tap Efficiency tier. Expires at the end of the CURRENT Tap
 * Season regardless of purchase date (spec 19, 41.9) — never permanent.
 */
async function purchaseEfficiencyUpgrade({ userId, tier }) {
  const { config, version: configVersion } = await economyConfigService.getConfig();
  const tierDef = upgradeStateService.findEfficiencyTier(tier, config);
  if (!tierDef || !tierDef.cost) throw new Error('invalid_efficiency_tier');

  const tapState = await TapState.findOne({ userId });
  if (!tapState) throw new Error('tap_state_missing');

  const activeSeason = await seasonService.getActiveSeasonCached();
  if (!activeSeason) throw new Error('no_active_season');

  await rewardLedgerService.applyBalanceChange({
    userId,
    currency: tierDef.cost.currency,
    amount: tierDef.cost.amount,
    direction: 'debit',
    source: 'upgrade_purchase',
    referenceType: 'Upgrade',
    configVersion,
  });

  tapState.efficiency = tierDef.multiplier;
  tapState.efficiencyTier = tierDef.tier;
  tapState.efficiencyExpiresAt = activeSeason.endAt;
  await tapState.save();

  const upgrade = await Upgrade.create({
    userId,
    type: 'tapEfficiency',
    tier: tierDef.tier,
    cost: tierDef.cost,
    expiresAt: activeSeason.endAt,
  });

  return { upgrade, efficiencyExpiresAt: activeSeason.endAt };
}

module.exports = {
  purchaseCapacityUpgrade,
  purchaseMultitapUpgrade,
  purchaseRechargeSpeedUpgrade,
  purchaseEfficiencyUpgrade,
};
