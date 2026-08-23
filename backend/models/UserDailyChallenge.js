const mongoose = require('mongoose');
const { Schema } = mongoose;

const UserDailyChallengeSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    dailyChallengeId: { type: Schema.Types.ObjectId, ref: 'DailyChallenge', required: true, index: true },
    progress: { type: Number, default: 0 },
    completed: { type: Boolean, default: false },
    claimed: { type: Boolean, default: false },
    claimedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

UserDailyChallengeSchema.index({ userId: 1, dailyChallengeId: 1 }, { unique: true });

module.exports = mongoose.model('UserDailyChallenge', UserDailyChallengeSchema);
