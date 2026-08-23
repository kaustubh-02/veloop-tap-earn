const {
  TapEvent,
  RewardLedger,
  ConfigAudit,
  AdEvent,
  TapState,
  User,
  Spin,
  TapSeason,
} = require('../models');
const economyConfigService = require('../services/economyConfigService');
const seasonService = require('../services/seasonService');
const leaderboardService = require('../services/leaderboardService');

async function getConfig(_req, res, next) {
  try {
    const { config, version } = await economyConfigService.getConfig();
    return res.json({ config, version });
  } catch (err) {
    return next(err);
  }
}

async function updateConfig(req, res, next) {
  try {
    const { config, reason } = req.body;
    if (!config) return res.status(400).json({ error: 'bad_request', message: 'config is required' });
    if (!reason) return res.status(400).json({ error: 'bad_request', message: 'reason is required for audit trail' });

    const updated = await economyConfigService.updateConfig(config, req.userId, reason);
    return res.json({ status: 'ok', version: updated.version, config: updated.config });
  } catch (err) {
    return next(err);
  }
}

async function getConfigAudit(req, res, next) {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
    const audits = await ConfigAudit.find().sort({ createdAt: -1 }).limit(limit).populate('adminId', 'displayName email').lean();
    return res.json({ audits });
  } catch (err) {
    return next(err);
  }
}

/**
 * Tap analytics: physical/effective/accepted taps, active tappers, taps
 * per hour over the last 24h (spec section 43 "Tap Analytics").
 */
async function getTapAnalytics(_req, res, next) {
  try {
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [totals, hourly, activeTappers] = await Promise.all([
      TapEvent.aggregate([
        { $match: { createdAt: { $gte: since24h } } },
        {
          $group: {
            _id: null,
            totalAccepted: { $sum: 1 },
            totalPhysical: { $sum: '$physicalTapCount' },
            totalEffective: { $sum: '$effectiveTapCount' },
          },
        },
      ]),
      TapEvent.aggregate([
        { $match: { createdAt: { $gte: since24h } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%dT%H:00', date: '$createdAt' } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      TapEvent.distinct('userId', { createdAt: { $gte: since24h } }),
    ]);

    return res.json({
      last24h: totals[0] || { totalAccepted: 0, totalPhysical: 0, totalEffective: 0 },
      hourlyBuckets: hourly,
      activeTappers: activeTappers.length,
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * Reward issuance distribution by currency/source (spec 43 "Rewards").
 */
async function getRewardAnalytics(_req, res, next) {
  try {
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const byCurrency = await RewardLedger.aggregate([
      { $match: { createdAt: { $gte: since24h }, direction: 'credit' } },
      {
        $group: {
          _id: { currency: '$currency', source: '$source' },
          totalAmount: { $sum: { $toDouble: '$amount' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { totalAmount: -1 } },
    ]);
    return res.json({ last24h: byCurrency });
  } catch (err) {
    return next(err);
  }
}

/**
 * Anti-bot summary: strike counts and how many users currently carry
 * suspicious strikes (spec 43 "Anti-Bot").
 */
async function getAntiAbuseAnalytics(_req, res, next) {
  try {
    const flagged = await TapState.find({ suspiciousStrikeCount: { $gt: 0 } })
      .select('userId suspiciousStrikeCount')
      .populate('userId', 'displayName email')
      .limit(200)
      .lean();
    return res.json({ flaggedUsers: flagged });
  } catch (err) {
    return next(err);
  }
}

async function getAdAnalytics(_req, res, next) {
  try {
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const byEvent = await AdEvent.aggregate([
      { $match: { createdAt: { $gte: since24h } } },
      { $group: { _id: { placement: '$placement', eventType: '$eventType' }, count: { $sum: 1 } } },
    ]);
    return res.json({ last24h: byEvent });
  } catch (err) {
    return next(err);
  }
}

async function getSeasons(_req, res, next) {
  try {
    const seasons = await TapSeason.find().sort({ startAt: -1 }).limit(20).lean();
    return res.json({ seasons });
  } catch (err) {
    return next(err);
  }
}

async function forceRolloverSeason(_req, res, next) {
  try {
    const next_ = await seasonService.finalizeSeasonIfExpired(leaderboardService);
    if (!next_) {
      return res.json({ status: 'no_op', message: 'No active season is currently expired' });
    }
    return res.json({ status: 'ok', newSeason: next_ });
  } catch (err) {
    return next(err);
  }
}

async function getLedgerSearch(req, res, next) {
  try {
    const { userId, currency, source } = req.query;
    const filter = {};
    if (userId) filter.userId = userId;
    if (currency) filter.currency = currency;
    if (source) filter.source = source;

    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
    const entries = await RewardLedger.find(filter).sort({ createdAt: -1 }).limit(limit).populate('userId', 'displayName email').lean();
    return res.json({ entries });
  } catch (err) {
    return next(err);
  }
}

async function adjustBalance(req, res, next) {
  try {
    const rewardLedgerService = require('../services/rewardLedgerService');
    const { userId, currency, amount, direction, reason } = req.body;
    if (!userId || !currency || !amount || !direction || !reason) {
      return res.status(400).json({ error: 'bad_request', message: 'userId, currency, amount, direction and reason are required' });
    }
    const { user, ledgerEntry } = await rewardLedgerService.applyBalanceChange({
      userId,
      currency,
      amount,
      direction,
      source: 'admin_adjustment',
      referenceId: String(req.userId),
      referenceType: 'AdminAdjustment',
    });
    return res.json({ status: 'ok', balances: user.balances, ledgerEntry, reason });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  getConfig,
  updateConfig,
  getConfigAudit,
  getTapAnalytics,
  getRewardAnalytics,
  getAntiAbuseAnalytics,
  getAdAnalytics,
  getSeasons,
  forceRolloverSeason,
  getLedgerSearch,
  adjustBalance,
};
