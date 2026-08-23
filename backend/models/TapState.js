const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * TapState is the single mutable "live" document per user for everything
 * that changes on every tap or on a timer: energy, multitap, efficiency,
 * streak, combo, shield, energy bank, mystery-tap tracking and lucky-tap
 * eligibility. Kept separate from User so tap-hot-path writes don't
 * contend with profile writes.
 */
const TapStateSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },

    // ---- Energy ----
    energy: { type: Number, default: 500, min: 0 },
    maxEnergy: { type: Number, default: 500, min: 1 },
    rechargeRate: { type: Number, default: 20 }, // energy per rechargeIntervalMinutes
    rechargeIntervalMinutes: { type: Number, default: 20 },
    lastEnergyAt: { type: Date, default: Date.now }, // timestamp energy was last computed from

    // ---- Multitap ----
    tapMultiplier: { type: Number, default: 1 },
    multiplierTier: { type: String, default: 'x1' },
    multiplierExpiresAt: { type: Date, default: null },

    // ---- Tap Efficiency (seasonal) ----
    efficiency: { type: Number, default: 1 },
    efficiencyTier: { type: String, default: 'x1.0' },
    efficiencyExpiresAt: { type: Date, default: null },

    // ---- Recharge speed upgrade ----
    rechargeSpeedTier: { type: String, default: 'default' },

    // ---- Streak & Combo (separate timers per spec 41.10) ----
    streakCount: { type: Number, default: 0 },
    lastStreakTapAt: { type: Date, default: null },

    comboCount: { type: Number, default: 0 },
    lastComboTapAt: { type: Date, default: null },

    // ---- Tap counters (lifetime + windowed) ----
    physicalTapCountLifetime: { type: Number, default: 0 },
    effectiveTapCountLifetime: { type: Number, default: 0 },

    // Lucky Tap eligibility window (resets per season, tracked here for simplicity)
    tapsSinceLastLuckyWindow: { type: Number, default: 0 }, // counts toward 300 threshold
    luckyEligible: { type: Boolean, default: false },

    // Mystery Tap: counts effective taps toward next 250-tap milestone roll
    tapsSinceLastMysteryRoll: { type: Number, default: 0 },

    // ---- Boost (30s window) ----
    activeBoost: {
      boostId: { type: Schema.Types.ObjectId, ref: 'Boost', default: null },
      multiplier: { type: Number, default: 1 },
      startedAt: { type: Date, default: null },
      expiresAt: { type: Date, default: null },
    },

    // ---- Energy Shield (10-30s window per config) ----
    activeShield: {
      startedAt: { type: Date, default: null },
      expiresAt: { type: Date, default: null },
      cooldownUntil: { type: Date, default: null },
    },

    // ---- Energy Bank (3-day temporary reserve) ----
    energyBank: {
      capacity: { type: Number, default: 0 },
      current: { type: Number, default: 0 },
      purchaseCount: { type: Number, default: 0 }, // within the active cycle (max 2)
      activatedAt: { type: Date, default: null },
      expiresAt: { type: Date, default: null },
      lastRechargeAt: { type: Date, default: null },
    },

    // ---- Anti-abuse bookkeeping ----
    lastAcceptedTapAt: { type: Date, default: null },
    recentTapTimestamps: { type: [Date], default: [] }, // short rolling window for burst detection
    suspiciousStrikeCount: { type: Number, default: 0 },

    // Optimistic concurrency / reconciliation version
    stateVersion: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('TapState', TapStateSchema);
