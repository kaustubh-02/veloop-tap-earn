const adService = require('../services/adService');

async function getOpportunity(req, res, next) {
  try {
    const placement = req.query.placement || 'interstitial';
    const result = await adService.checkAdOpportunity({ userId: req.userId, placement });
    return res.json(result);
  } catch (err) {
    return next(err);
  }
}

async function logEvent(req, res, next) {
  try {
    const { placement, eventType } = req.body;
    if (!placement || !eventType) {
      return res.status(400).json({ error: 'bad_request', message: 'placement and eventType are required' });
    }
    const event = await adService.logAdEvent({ userId: req.userId, placement, eventType });
    return res.json({ status: 'ok', event });
  } catch (err) {
    return next(err);
  }
}

async function claimReward(req, res, next) {
  try {
    const { placement, opportunityEventId } = req.body;
    if (!placement || !opportunityEventId) {
      return res.status(400).json({ error: 'bad_request', message: 'placement and opportunityEventId are required' });
    }
    const result = await adService.grantRewardedBenefit({ userId: req.userId, placement, opportunityEventId });
    return res.json({ status: 'ok', ...result });
  } catch (err) {
    return next(err);
  }
}

module.exports = { getOpportunity, logEvent, claimReward };
