const { TapSeason } = require('../models');
const seasonService = require('../services/seasonService');
const leaderboardService = require('../services/leaderboardService');

async function getLeague(req, res, next) {
  try {
    const season = await seasonService.getActiveSeasonCached();
    if (!season) {
      return res.json({ season: null, top: [], myRank: null });
    }
    const { top, myRank } = await leaderboardService.getLeaderboard({
      seasonId: season._id,
      userId: req.userId,
      limit: 100,
    });
    return res.json({
      season: { seasonId: season.seasonId, name: season.name, startAt: season.startAt, endAt: season.endAt },
      top,
      myRank,
      rewardPreview: season.rewardRules,
    });
  } catch (err) {
    return next(err);
  }
}

async function getSeason(req, res, next) {
  try {
    const season = await seasonService.getActiveSeasonCached();
    if (!season) return res.json({ season: null });
    return res.json({
      season: {
        seasonId: season.seasonId,
        name: season.name,
        status: season.status,
        startAt: season.startAt,
        endAt: season.endAt,
        rewardRules: season.rewardRules,
      },
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = { getLeague, getSeason };
