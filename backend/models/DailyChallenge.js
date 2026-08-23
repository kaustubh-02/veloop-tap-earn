const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * DailyChallenge is one row per calendar day (server "daily reset time",
 * see config tapEconomy.dailyReset). Separate from Mission per spec
 * section 16 (its own reset cadence and simpler single-target reward).
 */
const DailyChallengeSchema = new Schema(
  {
    dateKey: { type: String, required: true, unique: true }, // e.g. '2026-08-20' in platform TZ
    title: { type: String, default: 'Daily Tap Challenge' },
    target: { type: Number, required: true }, // accepted effective taps required
    reward: {
      currency: { type: String, enum: ['tokens', 've', 'sve', 'gems', 'spins'], default: 'tokens' },
      amount: { type: Schema.Types.Decimal128, required: true },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('DailyChallenge', DailyChallengeSchema);
