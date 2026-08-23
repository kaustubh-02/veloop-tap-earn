const express = require('express');
const missionController = require('../controllers/missionController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

router.get('/missions', missionController.getMissions);
router.post('/missions/:id/claim', missionController.claimMission);
router.get('/daily-challenge', missionController.getDailyChallenge);
router.post('/daily-challenge/claim', missionController.claimDailyChallenge);

module.exports = router;
