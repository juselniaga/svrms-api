const express = require('express');
const router = express.Router();
const reviewsController = require('../controllers/reviews.controller');
const auth = require('../middleware/auth');

router.post('/', auth, reviewsController.submitReview);
router.get('/:application_id', auth, reviewsController.getReviewByApplication);

module.exports = router;
