const { TapLeagueScore, User } = require('../models');
const rewardLedgerService = require('./rewardLedgerService');

/**
 * Atomically increments a user's season score. Uses upsert so the first
 * tap of a season creates the row. Score = effective accepted taps
 * (spec 41.3: "Tap League score uses effective accepted taps").
 */
async function incrementSeasonScore({ seasonId, userId, effectiveTaps, session }) {
  const opts = session ? { session } : {};
  const existing = await TapLeagueScore.findOne({ seasonId, userId }).session(session || null);

  if (!existing) {
    await TapLeagueScore.create(
      [{ seasonId, userId, acceptedTapCount: effectiveTaps, firstReachedScoreAt: new Date() }],
      opts
    );
    return;
  }

  await TapLeagueScore.updateOne(
    { seasonId, userId },
    { $inc: { acceptedTapCount: effectiveTaps }, $set: { updatedAt: new Date() } },
    opts
  );
}

/**
 * Returns top N (default 100) plus the current user's rank/row, never
 * loading an unbounded leaderboard into memory (spec 22: "Do not load an
 * unbounded leaderboard into the browser").
 *
 * Tie-breaker per spec 41.13: higher score first; equal score -> earlier
 * firstReachedScoreAt first; still equal -> _id as deterministic fallback.
 */
async function getLeaderboard({ seasonId, userId, limit = 100 }) {
  const sortSpec = { acceptedTapCount: -1, firstReachedScoreAt: 1, _id: 1 };

  const topRows = await TapLeagueScore.find({ seasonId })
    .sort(sortSpec)
    .limit(limit)
    .populate('userId', 'displayName avatarUrl level')
    .lean();

  const top = topRows.map((row, idx) => ({
    rank: idx + 1,
    userId: row.userId._id,
    displayName: row.userId.displayName,
    avatarUrl: row.userId.avatarUrl,
    level: row.userId.level,
    score: row.acceptedTapCount,
  }));

  let myRank = top.find((r) => String(r.userId) === String(userId)) || null;

  if (!myRank) {
    const myRow = await TapLeagueScore.findOne({ seasonId, userId }).lean();
    if (myRow) {
      // Count how many users rank strictly above this user under the same
      // tie-break rule to compute an exact rank without loading everyone.
      const higherCount = await TapLeagueScore.countDocuments({
        seasonId,
        $or: [
          { acceptedTapCount: { $gt: myRow.acceptedTapCount } },
          {
            acceptedTapCount: myRow.acceptedTapCount,
            firstReachedScoreAt: { $lt: myRow.firstReachedScoreAt },
          },
          {
            acceptedTapCount: myRow.acceptedTapCount,
            firstReachedScoreAt: myRow.firstReachedScoreAt,
            _id: { $lt: myRow._id },
          },
        ],
      });
      const user = await User.findById(userId, 'displayName avatarUrl level').lean();
      myRank = {
        rank: higherCount + 1,
        userId,
        displayName: user ? user.displayName : 'You',
        avatarUrl: user ? user.avatarUrl : '',
        level: user ? user.level : 1,
        score: myRow.acceptedTapCount,
      };
    } else {
      const user = await User.findById(userId, 'displayName avatarUrl level').lean();
      myRank = {
        rank: null,
        userId,
        displayName: user ? user.displayName : 'You',
        avatarUrl: user ? user.avatarUrl : '',
        level: user ? user.level : 1,
        score: 0,
      };
    }
  }

  return { top, myRank };
}

/**
 * Season rollover reward distribution (spec 41.13). Idempotent via the
 * `rewardDistributed` flag on TapLeagueScore so a retried finalize never
 * double-pays.
 */
async function finalizeSeasonRewards(seasonId) {
  const { TapSeason } = require('../models');
  const season = await TapSeason.findById(seasonId);
  if (!season) return;

  const sortSpec = { acceptedTapCount: -1, firstReachedScoreAt: 1, _id: 1 };
  const allScores = await TapLeagueScore.find({ seasonId, rewardDistributed: false }).sort(sortSpec);

  for (let i = 0; i < allScores.length; i += 1) {
    const rank = i + 1;
    const row = allScores[i];
    const rule = season.rewardRules.find((r) => rank >= r.rankFrom && rank <= r.rankTo);

    row.rankSnapshot = rank;

    if (rule) {
      const currencies = ['ve', 'sve', 'tokens', 'gems', 'spins'];
      for (const currency of currencies) {
        const amount = Number(rule.reward[currency] || 0);
        if (amount > 0) {
          const isInt = currency === 'tokens' || currency === 'spins';
          // eslint-disable-next-line no-await-in-loop
          await rewardLedgerService.applyBalanceChange({
            userId: row.userId,
            currency,
            amount: isInt ? Math.round(amount) : amount,
            direction: 'credit',
            source: 'league_reward',
            referenceId: String(seasonId),
            referenceType: 'TapSeason',
          });
        }
      }
    }

    row.rewardDistributed = true;
    // eslint-disable-next-line no-await-in-loop
    await row.save();
  }
}

module.exports = {
  incrementSeasonScore,
  getLeaderboard,
  finalizeSeasonRewards,
};
