const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Configure Cloudinary storage for general files
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'euroshub/attachments',
    resource_type: 'auto', // Automatically detect file type
    transformation: [
      {
        quality: 'auto',
        fetch_format: 'auto'
      }
    ]
  },
});

// Configure Cloudinary storage specifically for images
const imageStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'euroshub/images',
    resource_type: 'image',
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
    transformation: [
      {
        width: 1200,
        height: 1200,
        crop: 'limit',
        quality: 'auto',
        fetch_format: 'auto'
      }
    ]
  },
});

// Configure multer with Cloudinary storage
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow all file types for general attachments
    cb(null, true);
  }
});

// Configure multer specifically for images
const uploadImage = multer({
  storage: imageStorage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit for images
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed for image uploads!'), false);
    }
  }
});

// Helper function to delete files from Cloudinary
const deleteFile = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (error) {
    console.error('Error deleting file from Cloudinary:', error);
    throw error;
  }
};

// Helper function to get optimized URL for images
const getOptimizedImageUrl = (publicId, options = {}) => {
  const defaultOptions = {
    quality: 'auto',
    fetch_format: 'auto',
    width: 'auto',
    dpr: 'auto'
  };

  return cloudinary.url(publicId, { ...defaultOptions, ...options });
};

module.exports = {
  cloudinary,
  upload,
  uploadImage,
  deleteFile,
  getOptimizedImageUrl
};