const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * TapLeagueScore is one row per (season, user) holding the season's
 * effective accepted-tap score used for ranking. Updated atomically on
 * every accepted tap via $inc.
 */
const TapLeagueScoreSchema = new Schema(
  {
    seasonId: { type: Schema.Types.ObjectId, ref: 'TapSeason', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    acceptedTapCount: { type: Number, default: 0 }, // effective accepted taps
    firstReachedScoreAt: { type: Date, default: Date.now }, // for tie-breaking
    rankSnapshot: { type: Number, default: null }, // filled at season finalize
    rewardDistributed: { type: Boolean, default: false },
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

TapLeagueScoreSchema.index({ seasonId: 1, userId: 1 }, { unique: true });
// Primary leaderboard sort index: highest score first, then earliest to reach it.
TapLeagueScoreSchema.index({ seasonId: 1, acceptedTapCount: -1, firstReachedScoreAt: 1 });

module.exports = mongoose.model('TapLeagueScore', TapLeagueScoreSchema);
