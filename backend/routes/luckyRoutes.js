const express = require('express');
const luckyController = require('../controllers/luckyController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

router.get('/lucky', luckyController.getLuckyStatus);
router.post('/lucky/spin', luckyController.spin);

module.exports = router;
