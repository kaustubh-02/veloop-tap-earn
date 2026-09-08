const mongoose = require('mongoose');
const { TapState, TapEvent, Boost } = require('../models');
const economyConfigService = require('./economyConfigService');
const energyService = require('./energyService');
const antiAbuseService = require('./antiAbuseService');
const upgradeStateService = require('./upgradeStateService');
const rewardRollService = require('./rewardRollService');
const rewardLedgerService = require('./rewardLedgerService');
const seasonService = require('./seasonService');
const leaderboardService = require('./leaderboardService');
const missionService = require('./missionService');

/**
 * processTap implements the exact sequence from spec section 30:
 *  1. Authenticate (done by middleware before this is called)
 *  2. Validate/dedupe requestId (idempotency)
 *  3. Read TapState atomically (transaction)
 *  4. Regenerate energy from elapsed time
 *  5. Check too-close-to-last-tap
 *  6. Reject suspicious/impossible patterns
 *  7. Check available energy and active shield
 *  8. Apply efficiency/multitap/boost rules
 *  9. Select reward via server-side probability config
 *  10. Update currency/energy/tap counters + season score atomically
 *  11. Write RewardLedger + TapEvent
 *  12. Return authoritative new state + reward animation payload
 *
 * Wrapped in a Mongo transaction so concurrent requests from the same
 * user can never double-spend energy or double-award rewards (spec 46).
 */
async function processTap({ userId, requestId, clientSentAt, precisionTapHit = false }) {
  const now = new Date();
  const { config, version: configVersion } = await economyConfigService.getConfig();

  // Idempotency pre-check outside the transaction (cheap, fails fast on
  // obvious replays; the unique index is the real guarantee under race).
  const existing = await TapEvent.findOne({ userId, requestId });
  if (existing) {
    return { status: 'duplicate', tapEvent: existing };
  }

  const session = await mongoose.startSession();
  let result;

  try {
    await session.withTransaction(async () => {
      const tapState = await TapState.findOne({ userId }).session(session);
      if (!tapState) throw new AppTapError('tap_state_missing', 'Tap state not initialized for user');

      // ---- 4. Regenerate energy from elapsed time ----
      const regen = energyService.regenerateEnergy(tapState, now);
      const bankRegen = energyService.regenerateEnergyBank(tapState.energyBank, config, now);

      // ---- 5 & 6. Timing + anti-abuse ----
      const timingCheck = antiAbuseService.validateTapTiming({
        lastAcceptedTapAt: tapState.lastAcceptedTapAt,
        recentTapTimestamps: tapState.recentTapTimestamps,
        now,
        config,
      });
      if (!timingCheck.allowed) {
        if (timingCheck.reason === 'suspicious_pattern') {
          const strike = antiAbuseService.registerStrike({
            suspiciousStrikeCount: tapState.suspiciousStrikeCount,
            config,
            now,
          });
          tapState.suspiciousStrikeCount = strike.suspiciousStrikeCount;
          await tapState.save({ session });
        }
        throw new AppTapError(timingCheck.reason, 'Tap rejected by anti-abuse timing check');
      }

      // ---- Resolve temporary bonuses (may have expired) ----
      const activeSeason = await seasonService.getActiveSeasonCached();
      const multitap = upgradeStateService.resolveMultitap(tapState, now);
      const efficiency = upgradeStateService.resolveEfficiency(tapState, activeSeason, now);
      const boost = upgradeStateService.resolveBoost(tapState, now);
      const streakCombo = upgradeStateService.resolveStreakAndCombo(tapState, config, now);

      // ---- 41.3: physical tap = 1 interaction; multitap scales effective count/energy ----
      const physicalTapCount = 1;
      const effectiveTapCount = physicalTapCount * multitap.tapMultiplier;

      const tapStateForEnergyCheck = { ...tapState.toObject(), energy: regen.energy, energyBank: bankRegen };

      // ---- 7. Check available energy (bank + normal) and shield ----
      const enoughEnergy = energyService.hasEnoughEnergy({
        effectiveCost: effectiveTapCount,
        energy: regen.energy,
        energyBank: bankRegen,
        activeShield: tapState.activeShield,
        config,
        now,
      });
      if (!enoughEnergy) {
        throw new AppTapError('energy_empty', 'Not enough energy for this tap');
      }

      const consumption = energyService.resolveEnergyConsumption({
        effectiveCost: effectiveTapCount,
        energy: regen.energy,
        energyBank: bankRegen,
        activeShield: tapState.activeShield,
        config,
        now,
      });

      // ---- 8 & 9. Reward roll, then apply efficiency/multitap/boost ----
      const rolled = rewardRollService.rollTapReward(config);
      const finalAmount = rewardRollService.applyMultipliers(
        rolled,
        { efficiency: efficiency.efficiency, boostMultiplier: boost.multiplier, tapMultiplier: multitap.tapMultiplier },
        config
      );

      // ---- Precision tap (validated server-side; client only reports a hit attempt) ----
      let precisionReward = null;
      if (precisionTapHit) {
        precisionReward = rewardRollService.rollPrecisionTapReward(config);
      }

      // ---- Mystery tap milestone check ----
      const newMysteryCounter = tapState.tapsSinceLastMysteryRoll + effectiveTapCount;
      let mysteryTriggered = false;
      let mysteryReward = 0;
      let mysteryCounterAfter = newMysteryCounter;
      if (newMysteryCounter >= config.mysteryTap.everyEffectiveTaps) {
        mysteryCounterAfter = newMysteryCounter % config.mysteryTap.everyEffectiveTaps;
        if (rewardRollService.rollMysteryTapTrigger(config)) {
          mysteryTriggered = true;
          mysteryReward = rewardRollService.rollMysteryTapReward(config);
        }
      }

      // ---- Lucky Tap eligibility + trigger ----
      const newLuckyWindowCount = tapState.tapsSinceLastLuckyWindow + effectiveTapCount;
      const luckyEligible = newLuckyWindowCount >= config.luckyTap.minAcceptedTaps;
      let luckyTriggered = false;
      if (luckyEligible && rewardRollService.rollLuckyTapTrigger(config)) {
        luckyTriggered = true;
      }

      // ---- Streak/combo increments ----
      const newStreakCount = streakCombo.streakCount + 1;
      const newComboCount = streakCombo.comboCount + 1;

      // ---- 10. Update TapState atomically ----
      tapState.energy = consumption.energyAfter;
      tapState.energyBank = consumption.bankAfter;
      tapState.lastEnergyAt = regen.lastEnergyAt;
      tapState.tapMultiplier = multitap.tapMultiplier;
      tapState.multiplierTier = multitap.multiplierTier;
      tapState.multiplierExpiresAt = multitap.multiplierExpiresAt;
      tapState.efficiency = efficiency.efficiency;
      tapState.efficiencyTier = efficiency.efficiencyTier;
      tapState.efficiencyExpiresAt = efficiency.efficiencyExpiresAt;
      tapState.physicalTapCountLifetime += physicalTapCount;
      tapState.effectiveTapCountLifetime += effectiveTapCount;
      tapState.tapsSinceLastMysteryRoll = mysteryCounterAfter;
      tapState.tapsSinceLastLuckyWindow = luckyEligible ? newLuckyWindowCount : newLuckyWindowCount;
      tapState.luckyEligible = luckyEligible;
      tapState.streakCount = newStreakCount;
      tapState.lastStreakTapAt = now;
      tapState.comboCount = newComboCount;
      tapState.lastComboTapAt = now;
      tapState.lastAcceptedTapAt = now;
      tapState.recentTapTimestamps = antiAbuseService.pushTapTimestamp(tapState.recentTapTimestamps, now);
      if (!boost.isActive && tapState.activeBoost.expiresAt) {
        tapState.activeBoost = { boostId: null, multiplier: 1, startedAt: null, expiresAt: null };
      }
      tapState.stateVersion += 1;

      await tapState.save({ session });

      // ---- Credit the rolled+scaled reward ----
      let ledgerEntry = null;
      if (finalAmount > 0 && rolled.type !== 'spin') {
        const r = await rewardLedgerService.applyBalanceChange({
          userId,
          currency: rolled.type,
          amount: finalAmount,
          direction: 'credit',
          source: 'tap_reward',
          referenceType: 'TapEvent',
          configVersion,
          session,
        });
        ledgerEntry = r.ledgerEntry;
      } else if (rolled.type === 'spin') {
        await rewardLedgerService.applyBalanceChange({
          userId,
          currency: 'spins',
          amount: finalAmount,
          direction: 'credit',
          source: 'tap_reward',
          referenceType: 'TapEvent',
          configVersion,
          session,
        });
      }

      if (precisionReward) {
        await rewardLedgerService.applyBalanceChange({
          userId,
          currency: 'tokens',
          amount: precisionReward,
          direction: 'credit',
          source: 'precision_tap',
          referenceType: 'TapEvent',
          configVersion,
          session,
        });
        // Mission progress for precision-tap missions is incremented
        // outside the transaction (best-effort, non-authoritative bookkeeping).
        missionService.incrementEventProgress({ userId, type: 'precision_tap', amount: 1 }).catch(() => null);
      }

      if (mysteryTriggered && mysteryReward > 0) {
        await rewardLedgerService.applyBalanceChange({
          userId,
          currency: 'sve',
          amount: mysteryReward,
          direction: 'credit',
          source: 'mystery_tap',
          referenceType: 'TapEvent',
          configVersion,
          session,
        });
      }

      // ---- Season score (effective accepted taps) ----
      if (activeSeason) {
        await leaderboardService.incrementSeasonScore({
          seasonId: activeSeason._id,
          userId,
          effectiveTaps: effectiveTapCount,
          session,
        });
      }

      // ---- Mission / daily challenge progress (taps_completed type) ----
      await missionService.incrementTapProgress({ userId, effectiveTaps: effectiveTapCount, session });
      // Combo-reached missions use a "max so far" progress model, tracked
      // best-effort outside the transaction (non-authoritative bookkeeping).
      missionService.incrementEventProgress({ userId, type: 'combo_reached', amount: newComboCount }).catch(() => null);

      // ---- 11. Write TapEvent ----
      const [tapEvent] = await TapEvent.create(
        [
          {
            userId,
            seasonId: activeSeason ? activeSeason._id : null,
            requestId,
            clientSentAt: clientSentAt || null,
            serverAcceptedAt: now,
            physicalTapCount,
            effectiveTapCount,
            energyBefore: regen.energy,
            energyAfter: consumption.energyAfter,
            energySource: consumption.source,
            multiplierApplied: multitap.tapMultiplier,
            efficiencyApplied: efficiency.efficiency,
            boostApplied: boost.multiplier,
            rewardType: rolled.type,
            rewardAmount: rewardLedgerService.toDecimal(finalAmount),
            isMysteryTap: mysteryTriggered,
            isPrecisionTap: !!precisionReward,
            configVersion,
          },
        ],
        { session }
      );

      result = {
        status: 'accepted',
        tapEvent,
        tapState,
        reward: { type: rolled.type, amount: finalAmount },
        mystery: mysteryTriggered ? { amount: mysteryReward } : null,
        precision: precisionReward ? { amount: precisionReward } : null,
        luckyTapEligible: luckyEligible,
        luckyTapTriggered: luckyTriggered,
        streakCount: newStreakCount,
        comboCount: newComboCount,
      };
    });
  } finally {
    session.endSession();
  }

  return result;
}

class AppTapError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code; // 'too_fast' | 'energy_empty' | 'suspicious_pattern' | 'cooldown_active' | 'tap_state_missing'
  }
}

module.exports = { processTap, AppTapError };
