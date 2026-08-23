const express = require('express');
const upgradeController = require('../controllers/upgradeController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

router.post('/', upgradeController.purchaseUpgrade);

module.exports = router;
