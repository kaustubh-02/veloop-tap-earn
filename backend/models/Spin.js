const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * Spin records every Lucky Tap / spin execution. The server generates and
 * stores the result BEFORE the client reveals the animation, and a unique
 * requestId enforces idempotency so double-spinning is impossible.
 */
const SpinSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    seasonId: { type: Schema.Types.ObjectId, ref: 'TapSeason', default: null },
    requestId: { type: String, required: true },
    source: { type: String, enum: ['lucky_tap', 'mission_reward'], default: 'lucky_tap' },
    resultType: { type: String, required: true }, // e.g. 'tokens_50', 've_20', 'spins_2', 'better_luck'
    resultAmount: { type: Schema.Types.Decimal128, default: null },
    resultCurrency: { type: String, enum: ['tokens', 've', 'sve', 'gems', 'spins', 'energy', 'voucher', 'none'], default: 'none' },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

SpinSchema.index({ userId: 1, requestId: 1 }, { unique: true });

module.exports = mongoose.model('Spin', SpinSchema);
