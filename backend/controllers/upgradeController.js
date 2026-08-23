const upgradePurchaseService = require('../services/upgradePurchaseService');

async function purchaseUpgrade(req, res, next) {
  try {
    const { type, tier } = req.body;
    if (!type) return res.status(400).json({ error: 'bad_request', message: 'type is required' });

    let result;
    switch (type) {
      case 'energyCapacity':
        result = await upgradePurchaseService.purchaseCapacityUpgrade({ userId: req.userId });
        break;
      case 'multitap':
        if (!tier) return res.status(400).json({ error: 'bad_request', message: 'tier is required for multitap' });
        result = await upgradePurchaseService.purchaseMultitapUpgrade({ userId: req.userId, tier });
        break;
      case 'rechargeSpeed':
        if (!tier) return res.status(400).json({ error: 'bad_request', message: 'tier is required for rechargeSpeed' });
        result = await upgradePurchaseService.purchaseRechargeSpeedUpgrade({ userId: req.userId, tier });
        break;
      case 'tapEfficiency':
        if (!tier) return res.status(400).json({ error: 'bad_request', message: 'tier is required for tapEfficiency' });
        result = await upgradePurchaseService.purchaseEfficiencyUpgrade({ userId: req.userId, tier });
        break;
      default:
        return res.status(400).json({ error: 'bad_request', message: `Unknown upgrade type: ${type}` });
    }

    return res.json({ status: 'ok', ...result });
  } catch (err) {
    return next(err);
  }
}

module.exports = { purchaseUpgrade };
