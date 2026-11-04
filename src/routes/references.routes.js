const express = require('express');
const router = express.Router();
const referencesController = require('../controllers/references.controller');
const auth = require('../middleware/auth');

router.get('/', auth, referencesController.getReferences);

module.exports = router;
