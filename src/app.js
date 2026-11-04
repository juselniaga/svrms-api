const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
// The PWA reaches this API same-origin through its proxy, so no cross-origin access by default
app.use(cors({ origin: process.env.CORS_ORIGIN || false }));
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
  // Multer's own errors (e.g. file too large) are the client's to fix
  const status = err.status || (err.name === 'MulterError' ? 400 : 500);
  if (status >= 500) console.error(err);

  // Unexpected errors can carry SQL or file paths, so their details stay in the log
  res.status(status).json({
    error: status < 500 ? err.message : 'Internal server error. Please try again later.',
    code: status < 500 ? err.code : 'INTERNAL_ERROR',
    details: err.details || null
  });
});

module.exports = app;
