const mongoose = require('mongoose');
const { Schema } = mongoose;

const AdEventSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    placement: { type: String, enum: ['interstitial', 'video', 'banner'], required: true },
    provider: { type: String, default: 'DemoAdProvider' },
    eventType: {
      type: String,
      enum: ['opportunity', 'shown', 'completed', 'skipped', 'failed', 'rewarded'],
      required: true,
      index: true,
    },
    optionalRewardReference: { type: String, default: null },
    verifiedByServer: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('AdEvent', AdEventSchema);
