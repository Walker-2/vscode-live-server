const express = require('express');
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const fs = require('fs');

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();

// =====================================================
// MIDDLEWARE
// =====================================================

// Security middleware
app.use(helmet());

// CORS middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  optionsSuccessStatus: 200
}));

// Body parser middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Serve uploaded files statically
const uploadDir = process.env.UPLOAD_DIR || 'uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
app.use(`/${uploadDir}`, express.static(uploadDir));

// =====================================================
// DATABASE CONFIGURATION
// =====================================================

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'tajitech',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelayMs: 0
});

// Test database connection
pool.getConnection()
  .then(connection => {
    console.log('✓ Database connected successfully');
    connection.release();
  })
  .catch(error => {
    console.error('✗ Database connection failed:', error.message);
    process.exit(1);
  });

// Export pool for use in other files
app.locals.db = pool;

// =====================================================
// ROUTES
// =====================================================

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Tajitech Backend is running',
    timestamp: new Date().toISOString()
  });
});

// API version endpoint
app.get('/api/version', (req, res) => {
  res.json({
    version: '1.0.0',
    name: 'Tajitech Backend API',
    environment: process.env.NODE_ENV || 'development'
  });
});

// Import route handlers
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const technologyRoutes = require('./routes/technologies');
const projectRoutes = require('./routes/projects');
const uploadRoutes = require('./routes/uploads');
const templateRoutes = require('./routes/templates');
const reviewRoutes = require('./routes/reviews');

// Register routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/technologies', technologyRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/reviews', reviewRoutes);

// =====================================================
// ERROR HANDLING
// =====================================================

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found',
    path: req.path
  });
});

// Global error handler
app.use((error, req, res, next) => {
  console.error('Error:', error);

  const statusCode = error.statusCode || 500;
  const message = error.message || 'Internal Server Error';

  res.status(statusCode).json({
    success: false,
    message: message,
    error: process.env.NODE_ENV === 'development' ? error : {}
  });
});

// =====================================================
// START SERVER
// =====================================================

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`
    ╔════════════════════════════════════════╗
    ║   Tajitech Backend Server Running      ║
    ║   Port: ${PORT}                           ║
    ║   Environment: ${process.env.NODE_ENV || 'development'}              ║
    ║   Database: ${process.env.DB_NAME || 'tajitech'}                 ║
    ╚════════════════════════════════════════╝
  `);
  console.log(`\nAPI Documentation: http://localhost:${PORT}/api/`);
  console.log(`Health Check: http://localhost:${PORT}/api/health\n`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\nShutting down server...');
  await pool.end();
  console.log('Database pool closed');
  process.exit(0);
});

module.exports = app;
