const express = require('express');
const adminController = require('../controllers/adminController');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth, requireAdmin);

router.get('/config', adminController.getConfig);
router.put('/config', adminController.updateConfig);
router.get('/config/audit', adminController.getConfigAudit);

router.get('/analytics/taps', adminController.getTapAnalytics);
router.get('/analytics/rewards', adminController.getRewardAnalytics);
router.get('/analytics/anti-abuse', adminController.getAntiAbuseAnalytics);
router.get('/analytics/ads', adminController.getAdAnalytics);

router.get('/seasons', adminController.getSeasons);
router.post('/seasons/rollover', adminController.forceRolloverSeason);

router.get('/ledger', adminController.getLedgerSearch);
router.post('/ledger/adjust', adminController.adjustBalance);

module.exports = router;
