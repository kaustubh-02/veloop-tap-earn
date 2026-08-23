const express = require('express');
const leagueController = require('../controllers/leagueController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

router.get('/league', leagueController.getLeague);
router.get('/season', leagueController.getSeason);

module.exports = router;
