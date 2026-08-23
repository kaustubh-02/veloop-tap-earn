const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * Upgrade records each purchase (capacity, multitap, recharge speed,
 * efficiency). Temporary upgrades carry expiresAt; permanent ones (energy
 * capacity, recharge speed) have expiresAt = null.
 */
const UpgradeSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: {
      type: String,
      enum: ['energyCapacity', 'multitap', 'rechargeSpeed', 'tapEfficiency'],
      required: true,
    },
    tier: { type: String, required: true }, // e.g. 'x2', '600', 'x1.2'
    cost: {
      currency: { type: String, enum: ['ve', 'sve', 'tokens', 'gems'], required: true },
      amount: { type: Schema.Types.Decimal128, required: true },
    },
    purchasedAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, default: null }, // null = permanent
    status: { type: String, enum: ['active', 'expired'], default: 'active', index: true },
  },
  { timestamps: true }
);

UpgradeSchema.index({ userId: 1, type: 1, status: 1 });

module.exports = mongoose.model('Upgrade', UpgradeSchema);
