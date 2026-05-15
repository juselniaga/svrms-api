const express = require('express');
const router = express.Router();
const syncController = require('../controllers/sync.controller');
const auth = require('../middleware/auth');

router.post('/', auth, syncController.syncOfflineData);

module.exports = router;
