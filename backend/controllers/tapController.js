const { v4: uuidv4, validate: isUuid } = require('uuid');
const { User, TapEvent, RewardLedger } = require('../models');
const tapService = require('../services/tapService');
const economyConfigService = require('../services/economyConfigService');
const stateSerializer = require('../services/stateSerializerService');
const seasonService = require('../services/seasonService');
const leaderboardService = require('../services/leaderboardService');

async function getState(req, res, next) {
  try {
    // Opportunistically roll over an expired season on read (cheap check,
    // cached 5s) so state never reports stale season info for long.
    await seasonService.finalizeSeasonIfExpired(leaderboardService).catch(() => null);

    const { config } = await economyConfigService.getConfig();
    const state = await stateSerializer.buildStatePayload(req.userId, config);
    const balances = await stateSerializer.buildBalancesPayload(req.user);
    return res.json({ state, balances });
  } catch (err) {
    return next(err);
  }
}

async function tap(req, res, next) {
  try {
    const { requestId, clientSentAt, precisionTapHit } = req.body;

    if (!requestId || typeof requestId !== 'string' || !isUuid(requestId)) {
      return res.status(400).json({ error: 'bad_request', message: 'A valid UUID requestId is required' });
    }

    const result = await tapService.processTap({
      userId: req.userId,
      requestId,
      clientSentAt: clientSentAt ? new Date(clientSentAt) : null,
      precisionTapHit: !!precisionTapHit,
    });

    if (result.status === 'duplicate') {
      return res.status(200).json({ status: 'duplicate', message: 'Tap already processed', tapEventId: result.tapEvent._id });
    }

    const { config } = await economyConfigService.getConfig();
    const state = await stateSerializer.buildStatePayload(req.userId, config);
    const user = await User.findById(req.userId);
    const balances = await stateSerializer.buildBalancesPayload(user);

    return res.json({
      status: 'accepted',
      reward: result.reward,
      mystery: result.mystery,
      precision: result.precision,
      luckyTapEligible: result.luckyTapEligible,
      luckyTapTriggered: result.luckyTapTriggered,
      streakCount: result.streakCount,
      comboCount: result.comboCount,
      state,
      balances,
    });
  } catch (err) {
    return next(err);
  }
}

async function history(req, res, next) {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 30, 100);
    const events = await TapEvent.find({ userId: req.userId }).sort({ createdAt: -1 }).limit(limit).lean();
    const ledger = await RewardLedger.find({ userId: req.userId }).sort({ createdAt: -1 }).limit(limit).lean();
    return res.json({ events, ledger });
  } catch (err) {
    return next(err);
  }
}

function generateRequestId(_req, res) {
  return res.json({ requestId: uuidv4() });
}

module.exports = { getState, tap, history, generateRequestId };
