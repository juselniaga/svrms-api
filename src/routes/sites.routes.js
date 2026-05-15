const express = require('express');
const router = express.Router();
const sitesController = require('../controllers/sites.controller');
const auth = require('../middleware/auth');

router.post('/', auth, sitesController.createSite);
router.get('/:application_id', auth, sitesController.getSiteByApplication);
router.put('/:site_id', auth, sitesController.updateSite);
router.delete('/:site_id', auth, sitesController.deleteSite);

module.exports = router;
