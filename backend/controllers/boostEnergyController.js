const boostEnergyService = require('../services/boostEnergyService');

async function activateBoost(req, res, next) {
  try {
    const result = await boostEnergyService.activateBoost({ userId: req.userId });
    return res.json({ status: 'ok', ...result });
  } catch (err) {
    return next(err);
  }
}

async function purchaseEnergyBank(req, res, next) {
  try {
    const result = await boostEnergyService.purchaseEnergyBank({ userId: req.userId });
    return res.json({ status: 'ok', ...result });
  } catch (err) {
    return next(err);
  }
}

async function purchaseEnergyShield(req, res, next) {
  try {
    const result = await boostEnergyService.purchaseEnergyShield({ userId: req.userId });
    return res.json({ status: 'ok', ...result });
  } catch (err) {
    return next(err);
  }
}

module.exports = { activateBoost, purchaseEnergyBank, purchaseEnergyShield };
