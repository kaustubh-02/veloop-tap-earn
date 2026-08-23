const express = require('express');
const boostEnergyController = require('../controllers/boostEnergyController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

router.post('/boost/activate', boostEnergyController.activateBoost);
router.post('/energy-bank/purchase', boostEnergyController.purchaseEnergyBank);
router.post('/shield/purchase', boostEnergyController.purchaseEnergyShield);

module.exports = router;
