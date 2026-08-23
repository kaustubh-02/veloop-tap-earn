const mongoose = require('mongoose');
const { Schema } = mongoose;

const TapSeasonSchema = new Schema(
  {
    seasonId: { type: String, required: true, unique: true }, // human/slug id e.g. 'season-2026-08'
    name: { type: String, required: true },
    status: { type: String, enum: ['upcoming', 'active', 'finalizing', 'archived'], default: 'upcoming', index: true },

    startAt: { type: Date, required: true },
    endAt: { type: Date, required: true },

    // Reward configuration by rank/tier for this season (snapshot from config at creation).
    rewardRules: [
      {
        rankFrom: Number,
        rankTo: Number,
        reward: {
          ve: Schema.Types.Decimal128,
          sve: Schema.Types.Decimal128,
          tokens: Number,
          gems: Schema.Types.Decimal128,
          spins: Number,
        },
      },
    ],

    // Tap efficiency tiers valid during this season (snapshot).
    efficiencyRules: { type: Schema.Types.Mixed, default: {} },

    seasonalLimits: { type: Schema.Types.Mixed, default: {} },

    rolloverCompletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('TapSeason', TapSeasonSchema);
