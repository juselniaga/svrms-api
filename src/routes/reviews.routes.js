const express = require('express');
const router = express.Router();
const reviewsController = require('../controllers/reviews.controller');
const auth = require('../middleware/auth');

router.post('/', auth, reviewsController.submitReview);
router.get('/:application_id', auth, reviewsController.getReviewByApplication);
router.put('/:review_id', auth, reviewsController.updateReview);
router.delete('/:review_id', auth, reviewsController.deleteReview);

module.exports = router;
