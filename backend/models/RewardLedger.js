const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * RewardLedger is the append-only source of truth for every balance
 * change (earn or spend) for auditability. Every currency mutation
 * anywhere in the system MUST write one of these in the same transaction.
 */
const RewardLedgerSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    source: {
      type: String,
      enum: [
        'tap_reward',
        'mystery_tap',
        'precision_tap',
        'lucky_spin',
        'mission_claim',
        'daily_challenge_claim',
        'league_reward',
        'upgrade_purchase',
        'energy_bank_purchase',
        'energy_shield_purchase',
        'ad_reward',
        'admin_adjustment',
      ],
      required: true,
      index: true,
    },
    direction: { type: String, enum: ['credit', 'debit'], required: true },
    currency: { type: String, enum: ['ve', 'sve', 'tokens', 'gems', 'spins', 'fragments'], required: true },
    amount: { type: Schema.Types.Decimal128, required: true },
    balanceAfter: { type: Schema.Types.Decimal128, required: true },
    referenceId: { type: String, default: null }, // e.g. TapEvent._id, Spin._id, Upgrade._id
    referenceType: { type: String, default: null },
    configVersion: { type: Number, default: 1 },
  },
  { timestamps: true }
);

RewardLedgerSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('RewardLedger', RewardLedgerSchema);
