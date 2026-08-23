const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * ConfigAudit records every admin configuration change:
 * admin, key path, old value, new value, timestamp, reason (spec 41.1 / 43).
 */
const ConfigAuditSchema = new Schema(
  {
    adminId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    fromVersion: { type: Number, required: true },
    toVersion: { type: Number, required: true },
    changedKeys: [{ type: String }], // dot-path keys that differed, e.g. 'reward.sve.probability'
    diff: { type: Schema.Types.Mixed, default: {} }, // { key: { old, new } }
    reason: { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ConfigAudit', ConfigAuditSchema);
