/**
 * rewardRollService performs every server-side random-outcome decision:
 * the per-tap SVE/VE/Spin/Gems/Tokens roll, the Lucky Tap spin table
 * roll, precision-tap and mystery-tap outcomes. The client NEVER decides
 * any of this (spec 4, 41.2, 41.12).
 *
 * All functions accept an injectable `rng` (defaults to Math.random) so
 * tests can supply deterministic sequences.
 */

function round1(n) {
  return Math.round(n * 10) / 10;
}

/**
 * Rolls one of SVE / VE / Spin / Gems / Tokens according to
 * config.reward probabilities (spec 41.2). Probabilities are read
 * directly from config so admins can retune without redeploying.
 */
function rollTapReward(config, rng = Math.random) {
  const { sve, ve, spin, gems, tokens } = config.reward;
  const roll = rng();

  let cumulative = 0;
  cumulative += sve.probability;
  if (roll < cumulative) {
    return { type: 'sve', amount: sve.amount };
  }

  cumulative += ve.probability;
  if (roll < cumulative) {
    const steps = Math.round((ve.max - ve.min) / ve.step) + 1;
    const stepIndex = Math.floor(rng() * steps);
    const amount = round1(ve.min + stepIndex * ve.step);
    return { type: 've', amount: Math.min(amount, ve.max) };
  }

  cumulative += spin.probability;
  if (roll < cumulative) {
    return { type: 'spin', amount: spin.amount };
  }

  cumulative += gems.probability;
  if (roll < cumulative) {
    const idx = Math.floor(rng() * gems.values.length);
    return { type: 'gems', amount: gems.values[idx] };
  }

  // Tokens = remainder bucket (spec: "backend should define Tokens as the
  // remaining 13%... Do not create an unaccounted reward bucket").
  const tokenAmount = Math.floor(tokens.min + rng() * (tokens.max - tokens.min + 1));
  return { type: 'tokens', amount: Math.min(tokenAmount, tokens.max) };
}

/**
 * Rolls the Lucky Tap / Spin outcome table (spec 41.12). Table entries
 * with probability 0 are effectively disabled but remain in config so
 * they can be re-enabled without a schema change.
 */
function rollSpin(config, rng = Math.random) {
  const { spinRewards } = config.luckyTap;
  const roll = rng();
  let cumulative = 0;
  for (const entry of spinRewards) {
    cumulative += entry.probability;
    if (roll < cumulative) {
      return entry;
    }
  }
  // Fallback (floating point safety net) — last entry.
  return spinRewards[spinRewards.length - 1];
}

/**
 * Per-tap Lucky Tap trigger roll, only ever called once the user has
 * crossed the minAcceptedTaps eligibility threshold (spec 14, 41.12).
 */
function rollLuckyTapTrigger(config, rng = Math.random) {
  return rng() < config.luckyTap.triggerProbability;
}

/**
 * Mystery Tap milestone roll, called once every N effective taps
 * (spec 41.11).
 */
function rollMysteryTapTrigger(config, rng = Math.random) {
  return rng() < config.mysteryTap.triggerProbability;
}

function rollMysteryTapReward(config, rng = Math.random) {
  const { rewardSveMin, rewardSveMax } = config.mysteryTap;
  return Math.floor(rewardSveMin + rng() * (rewardSveMax - rewardSveMin + 1));
}

/**
 * Precision Tap: whether a target appears this tap, and if the user's
 * reported tap coordinates/timing were accurate enough. NOTE: precision
 * accuracy is validated server-side against a server-issued target
 * window (see tapController) — never trust a client-only "hit" flag.
 */
function rollPrecisionTapAppearance(config, rng = Math.random) {
  return rng() < config.precisionTap.appearProbability;
}

function rollPrecisionTapReward(config, rng = Math.random) {
  const { rewardTokensMin, rewardTokensMax } = config.precisionTap;
  return Math.floor(rewardTokensMin + rng() * (rewardTokensMax - rewardTokensMin + 1));
}

/**
 * Applies Tap Efficiency + Boost multipliers to a rolled reward amount,
 * with currency-specific rounding (spec 41.9: "currency-specific
 * rounding... Do not multiply Spins... unless explicitly enabled").
 */
function applyMultipliers({ type, amount }, { efficiency, boostMultiplier }, config) {
  const efficiencyApplies = config.tapEfficiency.appliesTo.includes(type);
  const multiplier = (efficiencyApplies ? efficiency : 1) * (boostMultiplier || 1);

  if (type === 'spin' || multiplier === 1) {
    return amount;
  }

  const scaled = amount * multiplier;

  if (type === 'tokens') {
    return Math.round(scaled);
  }
  if (type === 've' || type === 'sve' || type === 'gems') {
    return round1(scaled);
  }
  return scaled;
}

module.exports = {
  rollTapReward,
  rollSpin,
  rollLuckyTapTrigger,
  rollMysteryTapTrigger,
  rollMysteryTapReward,
  rollPrecisionTapAppearance,
  rollPrecisionTapReward,
  applyMultipliers,
  round1,
};
