const luckyTapService = require('../services/luckyTapService');

async function getLuckyStatus(req, res, next) {
  try {
    const status = await luckyTapService.getLuckyStatus({ userId: req.userId });
    return res.json(status);
  } catch (err) {
    return next(err);
  }
}

async function spin(req, res, next) {
  try {
    const { requestId } = req.body;
    if (!requestId) return res.status(400).json({ error: 'bad_request', message: 'requestId is required' });

    const result = await luckyTapService.executeSpin({ userId: req.userId, requestId });
    return res.json(result);
  } catch (err) {
    return next(err);
  }
}

module.exports = { getLuckyStatus, spin };
