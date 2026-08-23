const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * TapEvent records every ACCEPTED tap for auditability, analytics and
 * idempotency (unique requestId per user). Rejected taps are not stored
 * here in full (would be unbounded); they are only counted/logged for
 * anti-abuse via TapState + server logs.
 */
const TapEventSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    seasonId: { type: Schema.Types.ObjectId, ref: 'TapSeason', default: null, index: true },

    requestId: { type: String, required: true },

    clientSentAt: { type: Date, default: null },
    serverAcceptedAt: { type: Date, required: true, default: Date.now },

    physicalTapCount: { type: Number, default: 1 },
    effectiveTapCount: { type: Number, required: true },

    energyBefore: { type: Number, required: true },
    energyAfter: { type: Number, required: true },
    energySource: { type: String, enum: ['normal', 'bank', 'shield_free'], default: 'normal' },

    multiplierApplied: { type: Number, default: 1 },
    efficiencyApplied: { type: Number, default: 1 },
    boostApplied: { type: Number, default: 1 },

    rewardType: { type: String, enum: ['sve', 've', 'spin', 'gems', 'tokens', 'none'], required: true },
    rewardAmount: { type: Schema.Types.Decimal128, required: true },

    isMysteryTap: { type: Boolean, default: false },
    isPrecisionTap: { type: Boolean, default: false },

    configVersion: { type: Number, default: 1 },
  },
  { timestamps: true }
);

// One requestId can only ever be accepted once per user -> idempotency.
TapEventSchema.index({ userId: 1, requestId: 1 }, { unique: true });
TapEventSchema.index({ userId: 1, createdAt: -1 });
TapEventSchema.index({ seasonId: 1, createdAt: -1 });

module.exports = mongoose.model('TapEvent', TapEventSchema);
