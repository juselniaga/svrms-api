const express = require('express');
const router = express.Router();
const sitesController = require('../controllers/sites.controller');
const auth = require('../middleware/auth');

router.post('/', auth, sitesController.createSite);
router.get('/:application_id', auth, sitesController.getSiteByApplication);

module.exports = router;
