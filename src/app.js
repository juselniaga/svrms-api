const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Basic Health Check
app.get('/v1/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'SVRMS API Services running' });
});

// Import Routes (To be created)
app.use('/v1/auth', require('./routes/auth.routes'));
app.use('/v1/todo', require('./routes/todo.routes'));
app.use('/v1/applications', require('./routes/applications.routes'));
app.use('/v1/sites', require('./routes/sites.routes'));
app.use('/v1/site-visits', require('./routes/siteVisits.routes'));
app.use('/v1/reviews', require('./routes/reviews.routes'));
app.use('/v1/sync', require('./routes/sync.routes'));

// Global Error Handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error. Please try again later.',
    code: err.code || 'INTERNAL_ERROR',
    details: err.details || null
  });
});

module.exports = app;
