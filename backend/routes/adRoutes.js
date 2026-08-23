const express = require('express');
const adController = require('../controllers/adController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

router.get('/opportunity', adController.getOpportunity);
router.post('/event', adController.logEvent);
router.post('/claim', adController.claimReward);

module.exports = router;
