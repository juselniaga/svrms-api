const express = require('express');
const router = express.Router();
const applicationsController = require('../controllers/applications.controller');
const auth = require('../middleware/auth');

router.get('/:application_id', auth, applicationsController.getApplicationById);

module.exports = router;
