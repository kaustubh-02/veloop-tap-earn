const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * Boost logs every activation of the temporary tap-reward boost window.
 * "Boost activation must be logged" per spec section 13.
 */
const BoostSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, default: 'standard' },
    multiplier: { type: Number, required: true },
    startedAt: { type: Date, required: true, default: Date.now },
    expiresAt: { type: Date, required: true },
    status: { type: String, enum: ['active', 'expired'], default: 'active', index: true },
    source: { type: String, enum: ['purchase', 'reward', 'ad'], default: 'purchase' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Boost', BoostSchema);
