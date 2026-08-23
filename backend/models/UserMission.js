const mongoose = require('mongoose');
const { Schema } = mongoose;

const UserMissionSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    missionId: { type: Schema.Types.ObjectId, ref: 'Mission', required: true, index: true },
    progress: { type: Number, default: 0 },
    completed: { type: Boolean, default: false },
    completedAt: { type: Date, default: null },
    claimed: { type: Boolean, default: false },
    claimedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// One progress row per user per mission instance; claim is idempotent via this + claimed flag.
UserMissionSchema.index({ userId: 1, missionId: 1 }, { unique: true });

module.exports = mongoose.model('UserMission', UserMissionSchema);
