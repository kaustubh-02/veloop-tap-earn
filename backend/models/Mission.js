const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * Mission defines a daily/seasonal task definition (shared across users).
 * Per-user progress lives in UserMission.
 */
const MissionSchema = new Schema(
  {
    missionKey: { type: String, required: true, unique: true }, // stable slug
    seasonId: { type: Schema.Types.ObjectId, ref: 'TapSeason', default: null },
    title: { type: String, required: true },
    description: { type: String, default: '' },
    type: {
      type: String,
      enum: ['taps_completed', 'combo_reached', 'precision_tap', 'boost_used', 'multi_session'],
      required: true,
    },
    target: { type: Number, required: true },
    reward: {
      currency: { type: String, enum: ['tokens', 've', 'sve', 'gems', 'spins'], default: 'tokens' },
      amount: { type: Schema.Types.Decimal128, required: true },
    },
    cadence: { type: String, enum: ['daily', 'seasonal'], default: 'daily' },
    activeFrom: { type: Date, required: true },
    activeTo: { type: Date, required: true },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Mission', MissionSchema);
