const { EconomyConfig, ConfigAudit } = require('../models');

/**
 * Single gateway for reading/writing the Tap & Earn economy configuration.
 * All other services MUST call getConfig() rather than importing
 * config/tapEconomy.defaults.js directly, so that admin edits propagate
 * everywhere without redeploying.
 *
 * Caching: the active config is cached in-process for cheapness on the
 * tap hot path. The cache is invalidated immediately on updateConfig().
 * In a multi-instance deployment this cache would need a pub/sub
 * invalidation signal (e.g. Redis) — documented in README as a scaling
 * note, out of scope for this task's infrastructure.
 */
let cachedActive = null; // { version, config, doc }

async function loadActiveFromDb() {
  const doc = await EconomyConfig.findOne({ isActive: true }).sort({ version: -1 }).lean();
  if (!doc) {
    throw new Error(
      'No active EconomyConfig found. Run `npm run seed` to create the initial configuration.'
    );
  }
  cachedActive = { version: doc.version, config: doc.config, doc };
  return cachedActive;
}

async function getConfig() {
  if (cachedActive) return cachedActive;
  return loadActiveFromDb();
}

async function getConfigValue(dotPath) {
  const { config } = await getConfig();
  return dotPath.split('.').reduce((acc, key) => (acc == null ? undefined : acc[key]), config);
}

function diffKeys(oldConfig, newConfig, prefix = '') {
  const changed = [];
  const diff = {};
  const keys = new Set([...Object.keys(oldConfig || {}), ...Object.keys(newConfig || {})]);
  for (const key of keys) {
    const path = prefix ? `${prefix}.${key}` : key;
    const oldVal = oldConfig ? oldConfig[key] : undefined;
    const newVal = newConfig ? newConfig[key] : undefined;
    const bothObjects =
      oldVal && newVal && typeof oldVal === 'object' && typeof newVal === 'object' &&
      !Array.isArray(oldVal) && !Array.isArray(newVal);
    if (bothObjects) {
      const nested = diffKeys(oldVal, newVal, path);
      changed.push(...nested.changed);
      Object.assign(diff, nested.diff);
    } else if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
      changed.push(path);
      diff[path] = { old: oldVal, new: newVal };
    }
  }
  return { changed, diff };
}

/**
 * Applies a partial or full update to the economy config. Creates a NEW
 * EconomyConfig version document (never mutates history), deactivates the
 * previous one, and writes a ConfigAudit row. Returns the new active config.
 *
 * @param {Object} partialOrFullConfig - deep-merged onto the current config
 * @param {String} adminId - User._id of the admin making the change
 * @param {String} reason - human-readable reason, required for audit trail
 */
async function updateConfig(partialOrFullConfig, adminId, reason) {
  if (!adminId) throw new Error('updateConfig requires adminId for audit trail');
  if (!reason || !reason.trim()) throw new Error('updateConfig requires a non-empty reason');

  const current = await getConfig();
  const merged = deepMerge(current.config, partialOrFullConfig);
  const { changed, diff } = diffKeys(current.config, merged);

  if (changed.length === 0) {
    return current; // no-op, nothing changed
  }

  const nextVersion = current.version + 1;

  await EconomyConfig.updateOne({ isActive: true }, { $set: { isActive: false } });
  const newDoc = await EconomyConfig.create({
    version: nextVersion,
    isActive: true,
    config: merged,
    createdBy: adminId,
    reason,
  });

  await ConfigAudit.create({
    adminId,
    fromVersion: current.version,
    toVersion: nextVersion,
    changedKeys: changed,
    diff,
    reason,
  });

  cachedActive = { version: newDoc.version, config: newDoc.config, doc: newDoc };
  return cachedActive;
}

function deepMerge(base, override) {
  if (override === null || typeof override !== 'object' || Array.isArray(override)) {
    return override === undefined ? base : override;
  }
  const out = { ...base };
  for (const key of Object.keys(override)) {
    if (
      base &&
      typeof base[key] === 'object' &&
      base[key] !== null &&
      !Array.isArray(base[key]) &&
      typeof override[key] === 'object' &&
      override[key] !== null &&
      !Array.isArray(override[key])
    ) {
      out[key] = deepMerge(base[key], override[key]);
    } else {
      out[key] = override[key];
    }
  }
  return out;
}

function invalidateCache() {
  cachedActive = null;
}

module.exports = {
  getConfig,
  getConfigValue,
  updateConfig,
  invalidateCache,
};
