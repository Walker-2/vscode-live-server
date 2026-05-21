const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const router = express.Router();

// =====================================================
// MIDDLEWARE
// =====================================================

// Validation middleware for signup
const validateSignup = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage('Username must be between 3 and 50 characters')
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage('Username can only contain letters, numbers, underscores, and hyphens'),
  body('email')
    .trim()
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  body('first_name')
    .trim()
    .isLength({ min: 2 })
    .withMessage('First name must be at least 2 characters'),
  body('last_name')
    .trim()
    .isLength({ min: 2 })
    .withMessage('Last name must be at least 2 characters')
];

// Validation middleware for login
const validateLogin = [
  body('email')
    .trim()
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  body('password')
    .exists()
    .withMessage('Password is required')
];

// =====================================================
// HELPER FUNCTIONS
// =====================================================

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET || 'your_jwt_secret_key',
    { expiresIn: process.env.JWT_EXPIRE || '7d' }
  );
};

// =====================================================
// ROUTES
// =====================================================

/**
 * POST /api/auth/signup
 * Register a new user
 */
router.post('/signup', validateSignup, async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { username, email, password, first_name, last_name } = req.body;
    const db = req.app.locals.db;

    // Check if user already exists
    const [existingUser] = await db.query(
      'SELECT id FROM users WHERE email = ? OR username = ?',
      [email, username]
    );

    if (existingUser.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Email or username already registered'
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    // Insert user into database
    const [result] = await db.query(
      'INSERT INTO users (username, email, password_hash, first_name, last_name, is_active) VALUES (?, ?, ?, ?, ?, TRUE)',
      [username, email, password_hash, first_name, last_name]
    );

    const userId = result.insertId;

    // Generate JWT token
    const token = generateToken(userId);

    // Fetch user data
    const [user] = await db.query(
      'SELECT id, username, email, first_name, last_name, is_admin, created_at FROM users WHERE id = ?',
      [userId]
    );

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: user[0],
        token
      }
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({
      success: false,
      message: 'Error during signup',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * POST /api/auth/login
 * Login a user
 */
router.post('/login', validateLogin, async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { email, password } = req.body;
    const db = req.app.locals.db;

    // Check if user exists
    const [users] = await db.query(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    const user = users[0];

    // Check if user is active
    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        message: 'Your account has been deactivated'
      });
    }

    // Compare password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Generate JWT token
    const token = generateToken(user.id);

    // Return user data without password hash
    const { password_hash, ...userWithoutPassword } = user;

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user: userWithoutPassword,
        token
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Error during login',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * POST /api/auth/logout
 * Logout a user (client-side token deletion)
 */
router.post('/logout', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Logout successful. Please delete the token from client-side storage.'
  });
});

/**
 * POST /api/auth/refresh-token
 * Refresh JWT token
 */
router.post('/refresh-token', (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Token is required'
      });
    }

    // Verify token
    jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret_key', (error, decoded) => {
      if (error) {
        return res.status(401).json({
          success: false,
          message: 'Token is invalid or expired'
        });
      }

      // Generate new token
      const newToken = generateToken(decoded.userId);

      res.status(200).json({
        success: true,
        message: 'Token refreshed successfully',
        data: {
          token: newToken
        }
      });
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({
      success: false,
      message: 'Error refreshing token',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/auth/verify
 * Verify JWT token
 */
router.get('/verify', (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret_key', (error, decoded) => {
      if (error) {
        return res.status(401).json({
          success: false,
          message: 'Token is invalid or expired'
        });
      }

      res.status(200).json({
        success: true,
        message: 'Token is valid',
        data: {
          userId: decoded.userId
        }
      });
    });
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Error verifying token',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;
