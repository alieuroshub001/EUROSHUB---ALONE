const express = require('express');
const { body } = require('express-validator');
const profileController = require('../controllers/profileController');
const { protect } = require('../middleware/auth');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const { cloudinary } = require('../config/cloudinary');
const multer = require('multer');

const router = express.Router();

// Configure Cloudinary storage for avatars
const avatarStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'euroshub/avatars',
    resource_type: 'image',
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
    transformation: [
      {
        width: 400,
        height: 400,
        crop: 'fill',
        gravity: 'face',
        quality: 'auto',
        fetch_format: 'auto'
      }
    ],
    public_id: (req, file) => `avatar-${req.user.id}-${Date.now()}`
  },
});

const fileFilter = (req, file, cb) => {
  // Check file type
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed'), false);
  }
};

const upload = multer({
  storage: avatarStorage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Validation rules
const profileValidation = [
  body('firstName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters'),
  body('lastName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2 and 50 characters'),
  body('employeeId')
    .optional()
    .trim()
    .isLength({ max: 20 })
    .withMessage('Employee ID cannot be more than 20 characters'),
  body('phone')
    .optional()
    .trim()
    .isLength({ max: 15 })
    .withMessage('Phone number cannot be more than 15 characters'),
  body('department')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Department cannot be more than 100 characters'),
  body('position')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Position cannot be more than 100 characters')
];

const passwordValidation = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('New password must contain at least one lowercase letter, one uppercase letter, and one number'),
  body('confirmPassword')
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error('Password confirmation does not match new password');
      }
      return true;
    })
];

// All routes require authentication
router.use(protect);

// Profile routes
router.get('/', profileController.getProfile);
router.put('/', profileValidation, profileController.updateProfile);

// Password routes
router.put('/password', passwordValidation, profileController.changePassword);

// Avatar routes
router.post('/avatar', upload.single('avatar'), profileController.uploadAvatar);
router.delete('/avatar', profileController.deleteAvatar);

// Error handling middleware for multer
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File too large. Maximum size is 5MB.'
      });
    }
  }

  if (error.message === 'Only image files are allowed') {
    return res.status(400).json({
      success: false,
      message: 'Only image files are allowed'
    });
  }

  res.status(500).json({
    success: false,
    message: 'File upload error'
  });
});

module.exports = router;