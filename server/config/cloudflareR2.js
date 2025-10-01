const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const multer = require('multer');
const path = require('path');

// Configure Cloudflare R2 Client (S3-compatible)
const r2Client = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT || process.env.CLOUDFLARE_R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || process.env.CLOUDFLARE_R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
  },
});

const BUCKET_NAME = process.env.R2_BUCKET_NAME || process.env.CLOUDFLARE_R2_BUCKET_NAME;

// Configure multer for file uploads (stores in memory before uploading to R2)
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  // Accept various file types
  const allowedTypes = [
    // Images
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    // Documents
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    // Text files
    'text/plain',
    'text/csv',
    // Archives
    'application/zip',
    'application/x-rar-compressed',
    'application/x-7z-compressed'
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File type ${file.mimetype} is not supported. Please upload images, PDFs, or Office documents.`), false);
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: fileFilter
});

/**
 * Upload file to Cloudflare R2
 * @param {Buffer} fileBuffer - File buffer
 * @param {string} fileName - Original file name
 * @param {string} mimetype - File MIME type
 * @param {string} cardId - Card ID for organizing files
 * @param {string} folderId - Optional folder ID
 * @returns {Promise<{key: string, url: string}>}
 */
const uploadToR2 = async (fileBuffer, fileName, mimetype, cardId, folderId = null) => {
  try {
    // Generate unique file key
    const timestamp = Date.now();
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const folderPath = folderId ? `${folderId}/` : '';
    const key = `cards/${cardId}/${folderPath}${timestamp}_${sanitizedFileName}`;

    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: fileBuffer,
      ContentType: mimetype,
    });

    await r2Client.send(command);

    // Construct public URL (if you have R2 custom domain configured)
    // Otherwise, you'll need to use signed URLs for private buckets
    const publicUrl = (process.env.R2_PUBLIC_URL || process.env.CLOUDFLARE_R2_PUBLIC_URL)
      ? `${process.env.R2_PUBLIC_URL || process.env.CLOUDFLARE_R2_PUBLIC_URL}/${key}`
      : key; // Store the key, generate signed URL on demand

    return {
      key: key,
      url: publicUrl
    };
  } catch (error) {
    console.error('Error uploading to R2:', error);
    throw new Error('Failed to upload file to cloud storage');
  }
};

/**
 * Delete file from Cloudflare R2
 * @param {string} key - File key in R2
 * @returns {Promise<void>}
 */
const deleteFromR2 = async (key) => {
  try {
    const command = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    await r2Client.send(command);
  } catch (error) {
    console.error('Error deleting from R2:', error);
    throw new Error('Failed to delete file from cloud storage');
  }
};

/**
 * Generate signed download URL for file
 * @param {string} key - File key in R2
 * @param {number} expiresIn - URL expiration time in seconds (default: 1 hour)
 * @returns {Promise<string>}
 */
const getSignedDownloadUrl = async (key, expiresIn = 3600) => {
  try {
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    const signedUrl = await getSignedUrl(r2Client, command, { expiresIn });
    return signedUrl;
  } catch (error) {
    console.error('Error generating signed URL:', error);
    throw new Error('Failed to generate download URL');
  }
};

/**
 * Get file metadata from R2
 * @param {string} key - File key in R2
 * @returns {Promise<object>}
 */
const getFileMetadata = async (key) => {
  try {
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    const response = await r2Client.send(command);

    return {
      contentType: response.ContentType,
      contentLength: response.ContentLength,
      lastModified: response.LastModified,
    };
  } catch (error) {
    console.error('Error getting file metadata:', error);
    throw new Error('Failed to get file metadata');
  }
};

/**
 * Helper function to get file extension
 * @param {string} filename - Original filename
 * @returns {string}
 */
const getFileExtension = (filename) => {
  return path.extname(filename).toLowerCase();
};

/**
 * Helper function to format file size
 * @param {number} bytes - File size in bytes
 * @returns {string}
 */
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
};

module.exports = {
  r2Client,
  upload,
  uploadToR2,
  deleteFromR2,
  getSignedDownloadUrl,
  getFileMetadata,
  getFileExtension,
  formatFileSize,
  BUCKET_NAME
};
