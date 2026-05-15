const express = require('express');
const router = express.Router();
const todoController = require('../controllers/todo.controller');
const auth = require('../middleware/auth');

router.get('/', auth, todoController.getTodoList);

module.exports = router;
