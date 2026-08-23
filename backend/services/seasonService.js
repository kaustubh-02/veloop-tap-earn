const { TapSeason } = require('../models');
const economyConfigService = require('./economyConfigService');

/**
 * Short-lived in-process cache for the active season, since it's read on
 * every single tap. Invalidated whenever a season transition happens.
 */
let cachedSeason = null;
let cachedAt = 0;
const CACHE_TTL_MS = 5000; // re-check every 5s so rollovers propagate quickly

async function getActiveSeasonCached() {
  const now = Date.now();
  if (cachedSeason && now - cachedAt < CACHE_TTL_MS) {
    return cachedSeason;
  }
  const season = await TapSeason.findOne({ status: 'active' }).sort({ startAt: -1 });
  cachedSeason = season;
  cachedAt = now;
  return season;
}

function invalidateSeasonCache() {
  cachedSeason = null;
  cachedAt = 0;
}

/**
 * Creates a new active season starting now, using config defaults +
 * snapshotting current league reward rules and efficiency tiers so
 * historical seasons remain interpretable even if the config changes
 * later (spec: "Season resets must not delete historical ledger data",
 * "Configuration changes must not alter historical ledger events").
 */
async function createSeason({ name, durationDays, createdReason = 'auto' } = {}) {
  const { config } = await economyConfigService.getConfig();
  const days = durationDays || config.seasons.defaultDurationDays;
  const startAt = new Date();
  const endAt = new Date(startAt.getTime() + days * 24 * 60 * 60 * 1000);

  const seasonId = `season-${startAt.toISOString().slice(0, 10)}-${Math.floor(Math.random() * 1000)}`;

  const rewardRules = config.league.rewards.map((r) => ({
    rankFrom: r.rankFrom,
    rankTo: r.rankTo,
    reward: {
      ve: r.reward.ve || 0,
      sve: r.reward.sve || 0,
      tokens: r.reward.tokens || 0,
      gems: r.reward.gems || 0,
      spins: r.reward.spins || 0,
    },
  }));

  const season = await TapSeason.create({
    seasonId,
    name: name || `Tap Season ${startAt.toISOString().slice(0, 10)}`,
    status: 'active',
    startAt,
    endAt,
    rewardRules,
    efficiencyRules: config.tapEfficiency,
    seasonalLimits: {},
  });

  invalidateSeasonCache();
  return season;
}

/**
 * Season rollover per spec 41.13: freeze scoring -> calculate ranks ->
 * distribute rewards exactly once -> archive the season -> activate the
 * next season -> reset seasonal efficiency. Distribution + rank
 * calculation are handled by leaderboardService to keep this file
 * focused on lifecycle transitions.
 */
async function finalizeSeasonIfExpired(leaderboardService) {
  const now = new Date();
  const expiredActive = await TapSeason.findOne({ status: 'active', endAt: { $lte: now } });
  if (!expiredActive) return null;

  expiredActive.status = 'finalizing';
  await expiredActive.save();

  await leaderboardService.finalizeSeasonRewards(expiredActive._id);

  expiredActive.status = 'archived';
  expiredActive.rolloverCompletedAt = new Date();
  await expiredActive.save();

  invalidateSeasonCache();
  const next = await createSeason({ createdReason: 'rollover' });
  return next;
}

module.exports = {
  getActiveSeasonCached,
  invalidateSeasonCache,
  createSeason,
  finalizeSeasonIfExpired,
};
