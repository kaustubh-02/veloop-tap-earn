const { TapState, Spin } = require('../models');
const economyConfigService = require('./economyConfigService');
const rewardRollService = require('./rewardRollService');
const rewardLedgerService = require('./rewardLedgerService');
const seasonService = require('./seasonService');

/**
 * Executes one Lucky Tap spin. Requires the user to be eligible (300+
 * accepted taps in the tracking window, spec 14) and enforces idempotency
 * via a unique (userId, requestId) index on Spin — a retried/duplicate
 * request returns the original stored result rather than rolling again
 * (spec: "Prevent double-spinning through idempotent server-side
 * processing").
 */
async function executeSpin({ userId, requestId }) {
  const existing = await Spin.findOne({ userId, requestId });
  if (existing) {
    return { status: 'duplicate', spin: existing };
  }

  const { config, version: configVersion } = await economyConfigService.getConfig();
  const tapState = await TapState.findOne({ userId });
  if (!tapState) throw new Error('tap_state_missing');

  if (!tapState.luckyEligible) {
    throw new Error('not_eligible_for_lucky_spin');
  }

  const activeSeason = await seasonService.getActiveSeasonCached();
  const result = rewardRollService.rollSpin(config);

  // Server creates and stores the result BEFORE the client reveals the
  // animation (spec 41.12).
  const spin = await Spin.create({
    userId,
    seasonId: activeSeason ? activeSeason._id : null,
    requestId,
    source: 'lucky_tap',
    resultType: result.key,
    resultAmount: rewardLedgerService.toDecimal(result.amount),
    resultCurrency: result.currency,
  });

  // Reset the lucky-tap eligibility window after a spin is consumed.
  tapState.tapsSinceLastLuckyWindow = 0;
  tapState.luckyEligible = false;
  await tapState.save();

  // Grant the reward (skip for 'none' outcomes like Better Luck).
  if (result.currency && result.currency !== 'none' && result.amount > 0) {
    if (result.currency === 'energy') {
      tapState.energy = Math.min(tapState.maxEnergy, tapState.energy + result.amount);
      await tapState.save();
    } else if (result.currency === 'voucher') {
      // Vouchers are disabled by default (probability 0) and would route
      // through a separate fulfillment system when enabled; not implemented.
    } else {
      const isInt = result.currency === 'tokens' || result.currency === 'spins';
      await rewardLedgerService.applyBalanceChange({
        userId,
        currency: result.currency,
        amount: isInt ? Math.round(result.amount) : result.amount,
        direction: 'credit',
        source: 'lucky_spin',
        referenceId: String(spin._id),
        referenceType: 'Spin',
        configVersion,
      });
    }
  }

  return { status: 'ok', spin };
}

async function getLuckyStatus({ userId }) {
  const { config } = await economyConfigService.getConfig();
  const tapState = await TapState.findOne({ userId });
  if (!tapState) throw new Error('tap_state_missing');

  return {
    eligible: tapState.luckyEligible,
    progress: Math.min(tapState.tapsSinceLastLuckyWindow, config.luckyTap.minAcceptedTaps),
    threshold: config.luckyTap.minAcceptedTaps,
  };
}

module.exports = { executeSpin, getLuckyStatus };
