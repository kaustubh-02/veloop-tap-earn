const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * EconomyConfig is THE single authoritative source for every tunable
 * number in the Tap & Earn economy (spec section 45). There is exactly
 * one "active" document at a time. Admin edits create a NEW version
 * document (never mutate history in place) so past TapEvent/RewardLedger
 * records stay interpretable against the configVersion they were created
 * under. Services read the active config via economyConfigService, which
 * caches it in memory and invalidates the cache on admin update.
 */
const EconomyConfigSchema = new Schema(
  {
    version: { type: Number, required: true, unique: true, index: true },
    isActive: { type: Boolean, default: true, index: true },

    // Full config blob. Structure documented in config/tapEconomy.defaults.js
    config: { type: Schema.Types.Mixed, required: true },

    createdBy: { type: Schema.Types.ObjectId, ref: 'User', default: null }, // null = system seed
    reason: { type: String, default: 'initial seed' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('EconomyConfig', EconomyConfigSchema);
