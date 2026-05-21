const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const router = express.Router();

// =====================================================
// AUTHENTICATION MIDDLEWARE
// =====================================================

const verifyToken = (req, res, next) => {
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
      req.userId = decoded.userId;
      next();
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error verifying token',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// =====================================================
// MULTER CONFIGURATION
// =====================================================

// Create uploads directory if it doesn't exist
const uploadDir = process.env.UPLOAD_DIR || 'uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const folder = req.body.folder || 'general';
    const folderPath = path.join(uploadDir, folder);
    
    // Create folder if it doesn't exist
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }
    
    cb(null, folderPath);
  },
  filename: (req, file, cb) => {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    cb(null, `${name}-${uniqueSuffix}${ext}`);
  }
});

// File filter
const fileFilter = (req, file, cb) => {
  const allowedExtensions = (process.env.ALLOWED_EXTENSIONS || 'jpg,jpeg,png,gif,svg').split(',');
  const ext = path.extname(file.originalname).toLowerCase().substring(1);
  const mime = file.mimetype;

  // Check file extension
  if (!allowedExtensions.includes(ext)) {
    return cb(new Error(`File type .${ext} is not allowed`), false);
  }

  // Check MIME type
  const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/svg+xml'];
  if (!allowedMimes.includes(mime)) {
    return cb(new Error('Invalid file type'), false);
  }

  cb(null, true);
};

// Multer upload configuration
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || 5242880) // 5MB default
  }
});

// =====================================================
// ROUTES
// =====================================================

/**
 * POST /api/uploads/image
 * Upload a single image
 * Required: Authentication token
 * Optional: folder (for organizing uploads)
 */
router.post('/image', verifyToken, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const fileUrl = `/${req.file.path.replace(/\\/g, '/')}`;
    const db = req.app.locals.db;

    // Optionally save file metadata to database
    if (req.body.saveMetadata === 'true') {
      const [result] = await db.query(
        `INSERT INTO uploads (user_id, file_name, file_url, file_size, file_type, folder, created_at)
         VALUES (?, ?, ?, ?, ?, ?, NOW())`,
        [
          req.userId,
          req.file.originalname,
          fileUrl,
          req.file.size,
          req.file.mimetype,
          req.body.folder || 'general'
        ]
      );

      return res.status(201).json({
        success: true,
        message: 'File uploaded successfully',
        data: {
          id: result.insertId,
          filename: req.file.filename,
          originalName: req.file.originalname,
          url: fileUrl,
          size: req.file.size,
          mimeType: req.file.mimetype,
          uploadedAt: new Date().toISOString()
        }
      });
    }

    res.status(201).json({
      success: true,
      message: 'File uploaded successfully',
      data: {
        filename: req.file.filename,
        originalName: req.file.originalname,
        url: fileUrl,
        size: req.file.size,
        mimeType: req.file.mimetype,
        uploadedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    // Delete uploaded file if there was an error
    if (req.file) {
      fs.unlink(req.file.path, (err) => {
        if (err) console.error('Error deleting file:', err);
      });
    }

    console.error('Upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Error uploading file',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * POST /api/uploads/multiple
 * Upload multiple images
 * Required: Authentication token
 * Optional: folder (for organizing uploads)
 */
router.post('/multiple', verifyToken, upload.array('images', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No files uploaded'
      });
    }

    const db = req.app.locals.db;
    const uploadedFiles = [];

    // Process each uploaded file
    for (const file of req.files) {
      const fileUrl = `/${file.path.replace(/\\/g, '/')}`;

      if (req.body.saveMetadata === 'true') {
        const [result] = await db.query(
          `INSERT INTO uploads (user_id, file_name, file_url, file_size, file_type, folder, created_at)
           VALUES (?, ?, ?, ?, ?, ?, NOW())`,
          [
            req.userId,
            file.originalname,
            fileUrl,
            file.size,
            file.mimetype,
            req.body.folder || 'general'
          ]
        );

        uploadedFiles.push({
          id: result.insertId,
          filename: file.filename,
          originalName: file.originalname,
          url: fileUrl,
          size: file.size,
          mimeType: file.mimetype
        });
      } else {
        uploadedFiles.push({
          filename: file.filename,
          originalName: file.originalname,
          url: fileUrl,
          size: file.size,
          mimeType: file.mimetype
        });
      }
    }

    res.status(201).json({
      success: true,
      message: `${req.files.length} files uploaded successfully`,
      data: {
        files: uploadedFiles,
        totalSize: req.files.reduce((sum, file) => sum + file.size, 0),
        uploadedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    // Delete all uploaded files if there was an error
    if (req.files) {
      req.files.forEach(file => {
        fs.unlink(file.path, (err) => {
          if (err) console.error('Error deleting file:', err);
        });
      });
    }

    console.error('Multiple upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Error uploading files',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * DELETE /api/uploads/:filename
 * Delete an uploaded file
 * Required: Authentication token
 */
router.delete('/:filename', verifyToken, async (req, res) => {
  try {
    const { filename } = req.params;
    const folder = req.query.folder || 'general';
    const filePath = path.join(uploadDir, folder, filename);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }

    // Delete file from filesystem
    fs.unlinkSync(filePath);

    // Delete from database if it exists
    const db = req.app.locals.db;
    await db.query(
      'DELETE FROM uploads WHERE user_id = ? AND file_name = ?',
      [req.userId, filename]
    );

    res.status(200).json({
      success: true,
      message: 'File deleted successfully',
      data: {
        filename: filename
      }
    });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting file',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/uploads/list
 * List all user uploads
 * Required: Authentication token
 */
router.get('/list', verifyToken, async (req, res) => {
  try {
    const db = req.app.locals.db;
    const folder = req.query.folder || '%';

    const [uploads] = await db.query(
      `SELECT id, file_name, file_url, file_size, file_type, folder, created_at 
       FROM uploads 
       WHERE user_id = ? AND folder LIKE ? 
       ORDER BY created_at DESC`,
      [req.userId, folder]
    );

    res.status(200).json({
      success: true,
      message: 'Files retrieved successfully',
      data: {
        files: uploads,
        total: uploads.length
      }
    });
  } catch (error) {
    console.error('List error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving files',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/uploads/info/:id
 * Get file information
 * Required: Authentication token
 */
router.get('/info/:id', verifyToken, async (req, res) => {
  try {
    const db = req.app.locals.db;
    const { id } = req.params;

    const [uploads] = await db.query(
      `SELECT * FROM uploads WHERE id = ? AND user_id = ?`,
      [id, req.userId]
    );

    if (uploads.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'File information retrieved successfully',
      data: uploads[0]
    });
  } catch (error) {
    console.error('Info error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving file information',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// =====================================================
// ERROR HANDLING FOR MULTER
// =====================================================

router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'FILE_TOO_LARGE') {
      return res.status(413).json({
        success: false,
        message: 'File size exceeds maximum limit (5MB)'
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Too many files uploaded (maximum 10)'
      });
    }
  }

  if (error && error.message) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }

  next(error);
});

module.exports = router;
