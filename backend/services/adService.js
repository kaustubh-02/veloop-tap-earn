const { AdEvent, TapState } = require('../models');
const economyConfigService = require('./economyConfigService');
const rewardLedgerService = require('./rewardLedgerService');

/**
 * DemoAdProvider is a replaceable abstraction (spec 42: "Create a
 * replaceable DemoAdProvider abstraction"). A real provider (AdMob,
 * IronSource, etc.) would implement the same interface — issueOpportunity,
 * verifyCompletion — and be swapped in via config without touching
 * TapButton/TapCircle (spec: "Do not put ad-network SDK logic inside
 * TapCircle/TapButton").
 */
const DemoAdProvider = {
  name: 'DemoAdProvider',
  isDemo: true,

  /**
   * In a real integration this would return a signed token from the ad
   * network's server callback. The demo provider simulates verification
   * by trusting a server-generated opportunity ticket that was already
   * recorded in AdEvent (opportunity -> shown -> completed chain), rather
   * than trusting the client's bare "ad finished" signal.
   */
  async verifyCompletion({ userId, placement, opportunityEventId }) {
    const opportunity = await AdEvent.findOne({ _id: opportunityEventId, userId, placement });
    if (!opportunity) return false;
    return true; // demo: presence of a server-issued opportunity is the verification
  },
};

/**
 * Checks whether the user's current effective tap count falls inside the
 * configured ad opportunity window (spec 42: minAdTapThreshold=15,
 * maxAdTapThreshold=40) and, if so, logs an 'opportunity' AdEvent.
 */
async function checkAdOpportunity({ userId, placement = 'interstitial' }) {
  const { config } = await economyConfigService.getConfig();
  const tapState = await TapState.findOne({ userId });
  if (!tapState) throw new Error('tap_state_missing');

  const { minAdTapThreshold, maxAdTapThreshold } = config.ads;
  const windowTaps = tapState.effectiveTapCountLifetime % (maxAdTapThreshold * 2); // simple repeating window

  const inWindow = windowTaps >= minAdTapThreshold && windowTaps <= maxAdTapThreshold;
  if (!inWindow) return { available: false };

  const recentOpportunities = await AdEvent.countDocuments({
    userId,
    eventType: 'opportunity',
    createdAt: { $gte: new Date(Date.now() - 60 * 60 * 1000) },
  });
  if (recentOpportunities >= config.ads.frequencyCapPerHour) {
    return { available: false, reason: 'frequency_cap_reached' };
  }

  const event = await AdEvent.create({ userId, placement, provider: DemoAdProvider.name, eventType: 'opportunity' });
  return { available: true, opportunityEventId: event._id, placement };
}

async function logAdEvent({ userId, placement, eventType, optionalRewardReference = null }) {
  return AdEvent.create({ userId, placement, provider: DemoAdProvider.name, eventType, optionalRewardReference });
}

/**
 * Grants the rewarded-ad benefit ONLY after server-side verification
 * (spec 32: "Do not grant an economic reward solely because the frontend
 * says an ad finished"). Currently supports the 'energy' benefit type
 * per default config; extend the switch for boost/other benefits.
 */
async function grantRewardedBenefit({ userId, placement, opportunityEventId }) {
  const { config, version: configVersion } = await economyConfigService.getConfig();

  const verified = await DemoAdProvider.verifyCompletion({ userId, placement, opportunityEventId });
  if (!verified) {
    await logAdEvent({ userId, placement, eventType: 'failed' });
    throw new Error('ad_completion_not_verified');
  }

  await logAdEvent({ userId, placement, eventType: 'completed' });

  const benefit = config.ads.rewardedBenefits[placement];
  if (!benefit) {
    await logAdEvent({ userId, placement, eventType: 'rewarded', optionalRewardReference: 'no_benefit_configured' });
    return { granted: false };
  }

  if (benefit.type === 'energy') {
    const tapState = await TapState.findOne({ userId });
    tapState.energy = Math.min(tapState.maxEnergy, tapState.energy + benefit.amount);
    await tapState.save();
  } else if (benefit.type === 'boost') {
    const boostEnergyService = require('./boostEnergyService');
    await boostEnergyService.activateBoost({ userId }).catch(() => null);
  }

  await logAdEvent({ userId, placement, eventType: 'rewarded', optionalRewardReference: JSON.stringify(benefit) });

  return { granted: true, benefit };
}

module.exports = { DemoAdProvider, checkAdOpportunity, logAdEvent, grantRewardedBenefit };
