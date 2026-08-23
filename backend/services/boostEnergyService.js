const { TapState, Boost } = require('../models');
const economyConfigService = require('./economyConfigService');
const rewardLedgerService = require('./rewardLedgerService');
const energyService = require('./energyService');
const missionService = require('./missionService');

/**
 * Activates a 30-second boost window (spec 13). Logged to the Boost
 * collection for auditability. Prevents re-activation while one is
 * already running (a second purchase would just waste currency, so it's
 * blocked rather than silently stacking).
 */
async function activateBoost({ userId }) {
  const { config, version: configVersion } = await economyConfigService.getConfig();
  const tapState = await TapState.findOne({ userId });
  if (!tapState) throw new Error('tap_state_missing');

  const now = new Date();
  if (tapState.activeBoost.expiresAt && now < new Date(tapState.activeBoost.expiresAt)) {
    throw new Error('boost_already_active');
  }

  await rewardLedgerService.applyBalanceChange({
    userId,
    currency: config.boost.cost.currency,
    amount: config.boost.cost.amount,
    direction: 'debit',
    source: 'upgrade_purchase',
    referenceType: 'Boost',
    configVersion,
  });

  const expiresAt = new Date(now.getTime() + config.boost.durationSeconds * 1000);
  const boost = await Boost.create({
    userId,
    type: 'standard',
    multiplier: config.boost.multiplier,
    startedAt: now,
    expiresAt,
    status: 'active',
    source: 'purchase',
  });

  tapState.activeBoost = {
    boostId: boost._id,
    multiplier: config.boost.multiplier,
    startedAt: now,
    expiresAt,
  };
  await tapState.save();

  missionService.incrementEventProgress({ userId, type: 'boost_used', amount: 1 }).catch(() => null);

  return { boost, expiresAt, multiplier: config.boost.multiplier };
}

/**
 * Purchases Energy Bank capacity (spec 17, 41.7). Up to 2 purchases per
 * active 3-day cycle; the FIRST purchase in a fresh cycle also sets the
 * 3-day expiry and starts the 120-min recharge clock. A second purchase
 * within the same active cycle only adds capacity — it does NOT extend
 * expiry (spec: "does not extend the 3-day expiry").
 */
async function purchaseEnergyBank({ userId }) {
  const { config, version: configVersion } = await economyConfigService.getConfig();
  const tapState = await TapState.findOne({ userId });
  if (!tapState) throw new Error('tap_state_missing');

  const now = new Date();
  const bank = tapState.energyBank;
  const cycleActive = bank.expiresAt && now < new Date(bank.expiresAt);

  const purchaseNumber = cycleActive ? bank.purchaseCount + 1 : 1;
  if (purchaseNumber > config.energyBank.maxPurchasesPerCycle) {
    throw new Error('energy_bank_purchase_limit_reached');
  }

  const priceEntry = config.energyBank.purchasePrices.find((p) => p.purchaseNumber === purchaseNumber);
  if (!priceEntry) throw new Error('invalid_energy_bank_purchase_number');

  await rewardLedgerService.applyBalanceChange({
    userId,
    currency: priceEntry.cost.currency,
    amount: priceEntry.cost.amount,
    direction: 'debit',
    source: 'energy_bank_purchase',
    referenceType: 'TapState',
    configVersion,
  });

  if (!cycleActive) {
    tapState.energyBank = {
      capacity: priceEntry.addsCapacity,
      current: priceEntry.addsCapacity,
      purchaseCount: 1,
      activatedAt: now,
      expiresAt: new Date(now.getTime() + config.energyBank.validityDays * 24 * 60 * 60 * 1000),
      lastRechargeAt: now,
    };
  } else {
    const newCapacity = Math.min(config.energyBank.maxCapacityPerCycle, bank.capacity + priceEntry.addsCapacity);
    tapState.energyBank = {
      ...bank,
      capacity: newCapacity,
      current: Math.min(newCapacity, bank.current + priceEntry.addsCapacity),
      purchaseCount: purchaseNumber,
    };
  }

  await tapState.save();
  return { energyBank: tapState.energyBank };
}

/**
 * Activates the Energy Shield (spec 18, 41.8): 100 VEs, 30s duration
 * (41.8 supersedes the 10s figure in section 18 — see config comment),
 * 90% protection rate, 1 active max, blocked while active, 5-min cooldown
 * after use.
 */
async function purchaseEnergyShield({ userId }) {
  const { config, version: configVersion } = await economyConfigService.getConfig();
  const tapState = await TapState.findOne({ userId });
  if (!tapState) throw new Error('tap_state_missing');

  const now = new Date();

  if (energyService.isShieldActive(tapState.activeShield, now)) {
    throw new Error('shield_already_active');
  }
  if (energyService.isShieldOnCooldown(tapState.activeShield, now)) {
    throw new Error('shield_on_cooldown');
  }

  await rewardLedgerService.applyBalanceChange({
    userId,
    currency: config.energyShield.cost.currency,
    amount: config.energyShield.cost.amount,
    direction: 'debit',
    source: 'energy_shield_purchase',
    referenceType: 'TapState',
    configVersion,
  });

  const expiresAt = new Date(now.getTime() + config.energyShield.durationSeconds * 1000);
  const cooldownUntil = new Date(expiresAt.getTime() + config.energyShield.cooldownMinutes * 60 * 1000);

  tapState.activeShield = { startedAt: now, expiresAt, cooldownUntil };
  await tapState.save();

  return { startedAt: now, expiresAt, cooldownUntil };
}

module.exports = { activateBoost, purchaseEnergyBank, purchaseEnergyShield };
