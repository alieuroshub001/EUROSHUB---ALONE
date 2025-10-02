const express = require('express');
const router = express.Router();

const Card = require('../models/Card');
const List = require('../models/List');
const Folder = require('../models/Folder');
const Activity = require('../models/Activity');
const { protect } = require('../middleware/auth');
const {
  upload,
  uploadToR2,
  deleteFromR2,
  getSignedDownloadUrl
} = require('../config/cloudflareR2');

// Middleware to get card and check access
const getCardWithAccess = async (req, res, next) => {
  try {
    const card = await Card.findById(req.params.cardId);

    if (!card) {
      return res.status(404).json({
        success: false,
        message: 'Card not found'
      });
    }

    const hasAccess = await card.hasAccess(req.user.id, req.user.role);
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this card'
      });
    }

    req.card = card;
    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error checking card access'
    });
  }
};

/**
 * @route   POST /api/cards/:cardId/files
 * @desc    Upload file(s) to card (with optional folder)
 * @access  Private
 */
router.post('/cards/:cardId/files', protect, getCardWithAccess, upload.array('files', 10), async (req, res) => {
  try {
    const { folderId } = req.body;
    const card = req.card;

    // Check permission
    const hasPermission = await card.hasPermission(req.user.id, 'write', req.user.role);
    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to upload files to this card'
      });
    }

    // Verify folder exists if provided
    if (folderId) {
      const folder = await Folder.findById(folderId);
      if (!folder || folder.isDeleted) {
        return res.status(404).json({
          success: false,
          message: 'Folder not found'
        });
      }

      if (folder.cardId.toString() !== req.params.cardId) {
        return res.status(400).json({
          success: false,
          message: 'Folder belongs to a different card'
        });
      }
    }

    // Check if files were uploaded
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No files provided'
      });
    }

    const uploadedFiles = [];

    // Upload each file to Cloudflare R2
    for (const file of req.files) {
      try {
        // Upload to R2
        const { key, url } = await uploadToR2(
          file.buffer,
          file.originalname,
          file.mimetype,
          req.params.cardId,
          folderId
        );

        // Create attachment object
        const attachment = {
          filename: key,
          originalName: file.originalname,
          mimetype: file.mimetype,
          size: file.size,
          url: url,
          cloudflareKey: key,
          folderId: folderId || null,
          uploadedBy: req.user.id,
          isDeleted: false
        };

        card.attachments.push(attachment);
        uploadedFiles.push({
          originalName: file.originalname,
          size: file.size,
          url: url
        });
      } catch (error) {
        console.error(`Error uploading file ${file.originalname}:`, error);
        // Continue with other files
      }
    }

    await card.save();

    // Log activity for each uploaded file
    if (uploadedFiles.length > 0) {
      const list = await List.findById(card.listId).select('boardId');

      for (const file of uploadedFiles) {
        await Activity.logActivity({
          type: 'card_file_uploaded',
          user: req.user.id,
          project: card.project || null,
          board: list ? list.boardId : null,
          list: card.listId,
          card: card._id,
          metadata: {
            entityName: card.title,
            entityId: card._id,
            fileName: file.originalName
          }
        });
      }
    }

    // Populate the newly added attachments for response
    await card.populate('attachments.uploadedBy', 'firstName lastName avatar');

    // Get only the newly uploaded attachments
    const newAttachments = card.attachments.slice(-uploadedFiles.length);

    res.status(201).json({
      success: true,
      data: newAttachments,
      message: `${uploadedFiles.length} file(s) uploaded successfully`
    });
  } catch (error) {
    console.error('Upload files error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error uploading files'
    });
  }
});

/**
 * @route   GET /api/cards/:cardId/files
 * @desc    Get all files for card (with folder structure)
 * @access  Private
 */
router.get('/cards/:cardId/files', protect, getCardWithAccess, async (req, res) => {
  try {
    const card = req.card;
    const { folderId } = req.query;

    // Populate attachments
    await card.populate('attachments.uploadedBy', 'firstName lastName avatar');

    // Filter out deleted files
    let files = card.attachments.filter(att => !att.isDeleted);

    // If folderId is provided, filter by folder
    if (folderId) {
      files = files.filter(att =>
        att.folderId && att.folderId.toString() === folderId
      );
    } else if (folderId === null || folderId === 'null') {
      // Root level files (no folder)
      files = files.filter(att => !att.folderId);
    }

    res.status(200).json({
      success: true,
      data: files
    });
  } catch (error) {
    console.error('Get files error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching files'
    });
  }
});

/**
 * @route   GET /api/files/:fileId/download
 * @desc    Get signed download URL for file
 * @access  Private
 */
router.get('/files/:fileId/download', protect, async (req, res) => {
  try {
    const { fileId } = req.params;
    const { cardId } = req.query;

    if (!cardId) {
      return res.status(400).json({
        success: false,
        message: 'Card ID is required'
      });
    }

    const card = await Card.findById(cardId);
    if (!card) {
      return res.status(404).json({
        success: false,
        message: 'Card not found'
      });
    }

    // Check access
    const hasAccess = await card.hasAccess(req.user.id, req.user.role);
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this file'
      });
    }

    // Find the attachment
    const attachment = card.attachments.id(fileId);
    if (!attachment || attachment.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }

    // Generate signed download URL
    const downloadUrl = await getSignedDownloadUrl(attachment.cloudflareKey || attachment.filename);

    res.status(200).json({
      success: true,
      data: {
        downloadUrl: downloadUrl,
        filename: attachment.originalName,
        mimetype: attachment.mimetype,
        size: attachment.size
      }
    });
  } catch (error) {
    console.error('Get download URL error:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating download URL'
    });
  }
});

/**
 * @route   DELETE /api/files/:fileId
 * @desc    Delete file from card and R2 storage
 * @access  Private
 */
router.delete('/files/:fileId', protect, async (req, res) => {
  try {
    const { fileId } = req.params;
    const { cardId } = req.query;

    if (!cardId) {
      return res.status(400).json({
        success: false,
        message: 'Card ID is required'
      });
    }

    const card = await Card.findById(cardId);
    if (!card) {
      return res.status(404).json({
        success: false,
        message: 'Card not found'
      });
    }

    // Check permission
    const hasPermission = await card.hasPermission(req.user.id, 'delete', req.user.role);
    if (!hasPermission) {
      // Check if user is the uploader
      const attachment = card.attachments.id(fileId);
      if (!attachment || attachment.uploadedBy.toString() !== req.user.id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to delete this file'
        });
      }
    }

    // Find the attachment
    const attachment = card.attachments.id(fileId);
    if (!attachment || attachment.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }

    // Store file name for activity log
    const fileName = attachment.originalName;

    // Delete from R2
    try {
      await deleteFromR2(attachment.cloudflareKey || attachment.filename);
    } catch (error) {
      console.error('Error deleting from R2:', error);
      // Continue with database deletion even if R2 deletion fails
    }

    // Mark as deleted in database (soft delete)
    attachment.isDeleted = true;
    await card.save();

    // Log activity
    const list = await List.findById(card.listId).select('boardId');
    await Activity.logActivity({
      type: 'card_file_deleted',
      user: req.user.id,
      project: card.project || null,
      board: list ? list.boardId : null,
      list: card.listId,
      card: card._id,
      metadata: {
        entityName: card.title,
        entityId: card._id,
        fileName: fileName
      }
    });

    res.status(200).json({
      success: true,
      message: 'File deleted successfully'
    });
  } catch (error) {
    console.error('Delete file error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting file'
    });
  }
});

/**
 * @route   GET /api/cards/:cardId/files/all
 * @desc    Get all files with folder information (organized view)
 * @access  Private
 */
router.get('/cards/:cardId/files/all', protect, getCardWithAccess, async (req, res) => {
  try {
    const card = req.card;

    // Populate attachments
    await card.populate('attachments.uploadedBy', 'firstName lastName avatar');

    // Get all folders
    const folders = await Folder.find({
      cardId: req.params.cardId,
      isDeleted: false
    }).sort({ name: 1 });

    // Filter out deleted files
    const files = card.attachments.filter(att => !att.isDeleted);

    // Group files by folder
    const filesByFolder = {
      root: files.filter(f => !f.folderId)
    };

    folders.forEach(folder => {
      filesByFolder[folder._id.toString()] = files.filter(f =>
        f.folderId && f.folderId.toString() === folder._id.toString()
      );
    });

    res.status(200).json({
      success: true,
      data: {
        folders: folders,
        files: filesByFolder,
        totalFiles: files.length
      }
    });
  } catch (error) {
    console.error('Get all files error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching files'
    });
  }
});

module.exports = router;
