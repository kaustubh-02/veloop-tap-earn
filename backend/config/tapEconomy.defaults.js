/**
 * DEFAULT Tap & Earn economy configuration.
 *
 * This object is only used to SEED the first EconomyConfig document in
 * MongoDB (see scripts/seed.js). After seeding, this file is never read
 * again at runtime — every service reads the DB-backed active config via
 * services/economyConfigService.js. This keeps the promise of spec 41.1:
 * "Admin changes must update the centralized value ... without
 * source-code edits."
 *
 * Numeric values below come directly from PDF section 41-43.
 */
module.exports = {
  // ---------------------------------------------------------------
  // 41.2 Tap reward roll (probabilities must sum to 1)
  // ---------------------------------------------------------------
  reward: {
    sve: { probability: 0.6, amount: 1 },
    ve: { probability: 0.2, min: 0.6, max: 1.7, step: 0.1 }, // discrete steps, 1 decimal
    spin: { probability: 0.02, amount: 1 },
    gems: { probability: 0.05, values: [0.5, 0.8, 1.0, 1.2, 1.5, 2.0] },
    tokens: { probability: 0.13, min: 5, max: 100 }, // remainder bucket
  },

  // ---------------------------------------------------------------
  // Energy (section 5, 6)
  // ---------------------------------------------------------------
  energy: {
    baseCapacity: 500,
    rechargeAmount: 20,
    rechargeIntervalMinutes: 20,
    capacityTiers: [
      { from: 500, to: 600, cost: { currency: 've', amount: 100 } },
      { from: 600, to: 700, cost: { currency: 've', amount: 150 } },
      { from: 700, to: 800, cost: { currency: 've', amount: 210 } },
      { from: 800, to: 900, cost: { currency: 've', amount: 280 } }, // configurable placeholder, seeded
      { from: 900, to: 1000, cost: { currency: 've', amount: 360 } }, // configurable placeholder, seeded
    ],
  },

  // ---------------------------------------------------------------
  // Multitap (section 7, 41.3, 41.5)
  // ---------------------------------------------------------------
  multitap: {
    tiers: [
      { tier: 'x1', multiplier: 1, cost: null, validityDays: null },
      { tier: 'x2', multiplier: 2, cost: { currency: 'sve', amount: 1000 }, validityDays: 7 },
      { tier: 'x3', multiplier: 3, cost: { currency: 'sve', amount: 1300 }, validityDays: 7 },
    ],
  },

  // ---------------------------------------------------------------
  // Recharge speed (section 8, 41.6)
  // ---------------------------------------------------------------
  rechargeSpeed: {
    tiers: [
      { tier: 'default', amount: 20, intervalMinutes: 20, cost: null },
      { tier: 'tier1', amount: 22, intervalMinutes: 20, cost: { currency: 'tokens', amount: 2000 } },
      { tier: 'tier2', amount: 24, intervalMinutes: 20, cost: { currency: 'tokens', amount: 3200 } },
      { tier: 'tier3', amount: 27, intervalMinutes: 20, cost: { currency: 'tokens', amount: 4800 } },
      { tier: 'tier4', amount: 30, intervalMinutes: 20, cost: { currency: 'tokens', amount: 7000 } },
    ],
  },

  // ---------------------------------------------------------------
  // Energy Bank (section 17, 41.7)
  // ---------------------------------------------------------------
  energyBank: {
    initialCapacity: 500,
    purchasePrices: [
      { purchaseNumber: 1, cost: { currency: 've', amount: 100 }, addsCapacity: 500 },
      { purchaseNumber: 2, cost: { currency: 've', amount: 500 }, addsCapacity: 500 },
    ],
    maxPurchasesPerCycle: 2,
    maxCapacityPerCycle: 1000,
    rechargeAmount: 20,
    rechargeIntervalMinutes: 120,
    validityDays: 3,
  },

  // ---------------------------------------------------------------
  // Energy Shield (section 18, 41.8)
  // ---------------------------------------------------------------
  energyShield: {
    cost: { currency: 've', amount: 100 },
    durationSeconds: 30, // note: PDF section 18 says 10s, section 41.8 says 30s -> 41.8 is the
    // "Final Rule" so it takes precedence; admin-configurable either way.
    protectionRate: 0.9, // 90% of eligible taps consume no energy
    cooldownMinutes: 5,
    maxActive: 1,
    stackingAllowed: false,
  },

  // ---------------------------------------------------------------
  // Tap Efficiency (section 19, 41.9)
  // ---------------------------------------------------------------
  tapEfficiency: {
    tiers: [
      { tier: 'x1.0', multiplier: 1.0, cost: null },
      { tier: 'x1.1', multiplier: 1.1, cost: { currency: 'sve', amount: 1.1 } },
      { tier: 'x1.2', multiplier: 1.2, cost: { currency: 'sve', amount: 1.2 } },
      { tier: 'x1.3', multiplier: 1.3, cost: { currency: 'sve', amount: 1.3 } },
    ],
    appliesTo: ['sve', 've', 'tokens', 'gems'], // never spins unless explicitly enabled
  },

  // ---------------------------------------------------------------
  // Tap Streak / Combo (section 9, 12, 41.10)
  // ---------------------------------------------------------------
  tapStreak: {
    resetAfterSeconds: 5,
    milestoneRewardTokens: 1, // small, non-economy-damaging
    milestoneEvery: 25,
  },
  tapCombo: {
    resetAfterSeconds: 2,
  },

  // ---------------------------------------------------------------
  // Precision Tap (section 10)
  // ---------------------------------------------------------------
  precisionTap: {
    appearProbability: 0.03, // chance a precision target appears on a given tap
    rewardTokensMin: 10,
    rewardTokensMax: 30,
  },

  // ---------------------------------------------------------------
  // Mystery Tap (section 11, 41.11)
  // ---------------------------------------------------------------
  mysteryTap: {
    everyEffectiveTaps: 250,
    triggerProbability: 0.005,
    rewardSveMin: 2,
    rewardSveMax: 10,
  },

  // ---------------------------------------------------------------
  // Boost windows (section 13)
  // ---------------------------------------------------------------
  boost: {
    durationSeconds: 30,
    multiplier: 2,
    cost: { currency: 'tokens', amount: 500 },
    cooldownMinutes: 15,
  },

  // ---------------------------------------------------------------
  // Lucky Tap / Spin (section 14, 41.12)
  // ---------------------------------------------------------------
  luckyTap: {
    minAcceptedTaps: 300,
    triggerProbability: 0.01, // per-tap chance once eligible
    spinRewards: [
      { key: 'tokens_50', label: '50 Tokens', probability: 0.25, currency: 'tokens', amount: 50 },
      { key: 've_500', label: '500 VEs', probability: 0.0, currency: 've', amount: 500 }, // disabled
      { key: 've_20', label: '20 VEs', probability: 0.05, currency: 've', amount: 20 },
      { key: 'spins_2', label: '2 Spins', probability: 0.10, currency: 'spins', amount: 2 },
      { key: 'gems_10', label: '10 Gems', probability: 0.08, currency: 'gems', amount: 10 },
      { key: 'sve_100', label: '100 SVEs', probability: 0.12, currency: 'sve', amount: 100 },
      { key: 'sve_50', label: '50 SVEs', probability: 0.25, currency: 'sve', amount: 50 },
      { key: 'better_luck', label: 'Better Luck', probability: 0.10, currency: 'none', amount: 0 },
      { key: 'voucher_5', label: '₹5 Amazon Voucher', probability: 0.0, currency: 'voucher', amount: 5 }, // disabled
      { key: 'energy_15', label: '+15 Energy', probability: 0.05, currency: 'energy', amount: 15 },
    ],
  },

  // ---------------------------------------------------------------
  // Tap League rewards (section 41.13)
  // ---------------------------------------------------------------
  league: {
    topVisibleCount: 100,
    rewards: [
      { rankFrom: 1, rankTo: 1, reward: { ve: 10000, spins: 5 } },
      { rankFrom: 2, rankTo: 2, reward: { ve: 5000, spins: 3 } },
      { rankFrom: 3, rankTo: 3, reward: { ve: 1500, spins: 1 } },
      { rankFrom: 4, rankTo: 10, reward: { ve: 500, tokens: 2500 } },
      { rankFrom: 11, rankTo: 25, reward: { sve: 5000, tokens: 1000 } },
      { rankFrom: 26, rankTo: 50, reward: { sve: 2500, gems: 10 } },
      { rankFrom: 51, rankTo: 100, reward: { sve: 1000, tokens: 500 } },
    ],
  },

  // ---------------------------------------------------------------
  // VE Fragments (section 20) - conversion rate TBD, configurable
  // ---------------------------------------------------------------
  fragments: {
    conversionEnabled: false,
    fragmentsPerVe: null, // to be decided later; UI must handle null gracefully
  },

  // ---------------------------------------------------------------
  // Ads (section 42)
  // ---------------------------------------------------------------
  ads: {
    minAdTapThreshold: 15,
    maxAdTapThreshold: 40,
    placements: ['interstitial', 'video', 'banner'],
    rewardedBenefits: {
      video: { type: 'energy', amount: 30 },
    },
    frequencyCapPerHour: 3,
  },

  // ---------------------------------------------------------------
  // Seasons (section 21) - default length for auto-created seasons
  // ---------------------------------------------------------------
  seasons: {
    defaultDurationDays: 30,
  },

  // ---------------------------------------------------------------
  // Security / anti-abuse (section 31)
  // ---------------------------------------------------------------
  security: {
    minTapIntervalMs: 200,
    burstWindowMs: 10000,
    burstMaxTapsInWindow: 45, // ~ 10s / 200ms upper bound with slack
    identicalIntervalStrikeThreshold: 8, // N taps in a row with near-identical delta -> flag
    identicalIntervalToleranceMs: 3,
    maxStrikesBeforeTempBlock: 5,
    tempBlockMinutes: 10,
  },

  // Daily reset time in UTC (server-authoritative); UI converts to local.
  dailyResetUtcHour: 0,
};
