const express = require('express');
const router = express.Router();
const siteVisitsController = require('../controllers/siteVisits.controller');
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');

const uploadFields = upload.fields([
  { name: 'photos_north', maxCount: 1 },
  { name: 'photos_south', maxCount: 1 },
  { name: 'photo_east',   maxCount: 1 },
  { name: 'photo_west',   maxCount: 1 }
]);

router.post('/', auth, uploadFields, siteVisitsController.createSiteVisit);
router.get('/:application_id', auth, siteVisitsController.getSiteVisitByApplication);

module.exports = router;
