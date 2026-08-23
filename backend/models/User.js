const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const { Schema } = mongoose;

/**
 * User holds identity, profile and authoritative currency balances.
 * All balance mutations MUST go through services that also write a
 * RewardLedger entry (see services/rewardLedgerService.js). Never mutate
 * balances directly from a controller.
 */
const UserSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    passwordHash: { type: String, required: true },
    displayName: { type: String, required: true, trim: true, maxlength: 40 },
    avatarUrl: { type: String, default: '' },
    role: { type: String, enum: ['user', 'admin'], default: 'user', index: true },

    level: { type: Number, default: 1, min: 1 },
    xp: { type: Number, default: 0, min: 0 },

    // Authoritative currency balances. Stored as Decimal128 for VE/SVE (fractional),
    // integers for Tokens/Gems/Spins/Fragments.
    balances: {
      ve: { type: Schema.Types.Decimal128, default: () => mongoose.Types.Decimal128.fromString('0') },
      sve: { type: Schema.Types.Decimal128, default: () => mongoose.Types.Decimal128.fromString('0') },
      tokens: { type: Number, default: 0, min: 0 },
      gems: { type: Schema.Types.Decimal128, default: () => mongoose.Types.Decimal128.fromString('0') },
      spins: { type: Number, default: 0, min: 0 },
      fragments: { type: Number, default: 0, min: 0 },
    },

    currentTapSeasonId: { type: Schema.Types.ObjectId, ref: 'TapSeason', default: null },

    lastLoginAt: { type: Date, default: null },
  },
  { timestamps: true }
);

UserSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.passwordHash);
};

UserSchema.statics.hashPassword = function hashPassword(plain) {
  return bcrypt.hash(plain, 10);
};

// Never leak passwordHash in API responses
UserSchema.set('toJSON', {
  transform(_doc, ret) {
    delete ret.passwordHash;
    return ret;
  },
});

module.exports = mongoose.model('User', UserSchema);
