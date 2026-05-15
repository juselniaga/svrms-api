const app = require('./app');
const pool = require('./config/db');

const PORT = process.env.PORT || 3001;

const startServer = async () => {
  try {
    // Test DB connection
    const connection = await pool.getConnection();
    console.log('Database connection established successfully.');
    connection.release();

    app.listen(PORT, () => {
      console.log(`SVRMS API server running on port ${PORT} in ${process.env.NODE_ENV} mode.`);
    });
  } catch (error) {
    console.error('Failed to connect to the database:', error);
    process.exit(1);
  }
};

startServer();
