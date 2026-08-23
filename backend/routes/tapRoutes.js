const express = require('express');
const tapController = require('../controllers/tapController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth);

router.get('/state', tapController.getState);
router.post('/', tapController.tap);
router.get('/history', tapController.history);
router.get('/request-id', tapController.generateRequestId);

module.exports = router;
