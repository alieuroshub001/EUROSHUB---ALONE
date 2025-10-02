const express = require('express');
const router = express.Router();

const Folder = require('../models/Folder');
const Card = require('../models/Card');
const List = require('../models/List');
const Activity = require('../models/Activity');
const { protect } = require('../middleware/auth');

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

// Middleware to get folder and check access
const getFolderWithAccess = async (req, res, next) => {
  try {
    const folder = await Folder.findById(req.params.folderId);

    if (!folder) {
      return res.status(404).json({
        success: false,
        message: 'Folder not found'
      });
    }

    if (folder.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'Folder has been deleted'
      });
    }

    const hasAccess = await folder.hasAccess(req.user.id, req.user.role);
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this folder'
      });
    }

    req.folder = folder;
    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error checking folder access'
    });
  }
};

/**
 * @route   POST /api/cards/:cardId/folders
 * @desc    Create new folder in card
 * @access  Private
 */
router.post('/cards/:cardId/folders', protect, getCardWithAccess, async (req, res) => {
  try {
    const { name, parentFolderId } = req.body;

    // Check permission
    const hasPermission = await req.card.hasPermission(req.user.id, 'write', req.user.role);
    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to create folders in this card'
      });
    }

    // Validation
    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Folder name is required'
      });
    }

    // Verify parent folder exists if provided
    if (parentFolderId) {
      const parentFolder = await Folder.findById(parentFolderId);
      if (!parentFolder || parentFolder.isDeleted) {
        return res.status(404).json({
          success: false,
          message: 'Parent folder not found'
        });
      }

      if (parentFolder.cardId.toString() !== req.params.cardId) {
        return res.status(400).json({
          success: false,
          message: 'Parent folder belongs to a different card'
        });
      }
    }

    // Check for duplicate folder name in same location
    const existingFolder = await Folder.findOne({
      cardId: req.params.cardId,
      name: name.trim(),
      parentFolder: parentFolderId || null,
      isDeleted: false
    });

    if (existingFolder) {
      return res.status(400).json({
        success: false,
        message: 'A folder with this name already exists in this location'
      });
    }

    const folder = new Folder({
      name: name.trim(),
      cardId: req.params.cardId,
      parentFolder: parentFolderId || null,
      createdBy: req.user.id
    });

    await folder.save();

    // Log activity
    const card = req.card;
    const list = await List.findById(card.listId).select('boardId');
    await Activity.logActivity({
      type: 'card_folder_created',
      user: req.user.id,
      project: card.project || null,
      board: list ? list.boardId : null,
      list: card.listId,
      card: card._id,
      metadata: {
        entityName: card.title,
        entityId: card._id,
        folderName: folder.name
      }
    });

    res.status(201).json({
      success: true,
      data: folder,
      message: 'Folder created successfully'
    });
  } catch (error) {
    console.error('Create folder error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating folder'
    });
  }
});

/**
 * @route   GET /api/cards/:cardId/folders
 * @desc    Get folder tree for card
 * @access  Private
 */
router.get('/cards/:cardId/folders', protect, getCardWithAccess, async (req, res) => {
  try {
    // Get all folders for this card (not deleted)
    const folders = await Folder.find({
      cardId: req.params.cardId,
      isDeleted: false
    })
    .populate('createdBy', 'firstName lastName avatar')
    .sort({ createdAt: 1 });

    // Build folder tree structure
    const buildTree = (parentId = null) => {
      return folders
        .filter(folder => {
          const folderParentId = folder.parentFolder ? folder.parentFolder.toString() : null;
          return folderParentId === parentId;
        })
        .map(folder => ({
          ...folder.toObject(),
          children: buildTree(folder._id.toString())
        }));
    };

    const folderTree = buildTree(null);

    res.status(200).json({
      success: true,
      data: {
        folders: folderTree,
        flatList: folders
      }
    });
  } catch (error) {
    console.error('Get folders error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching folders'
    });
  }
});

/**
 * @route   GET /api/folders/:folderId
 * @desc    Get single folder details
 * @access  Private
 */
router.get('/folders/:folderId', protect, getFolderWithAccess, async (req, res) => {
  try {
    const folder = req.folder;

    // Get path
    const path = await folder.getPath();

    res.status(200).json({
      success: true,
      data: {
        ...folder.toObject(),
        path: path
      }
    });
  } catch (error) {
    console.error('Get folder error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching folder'
    });
  }
});

/**
 * @route   PUT /api/folders/:folderId
 * @desc    Update folder (rename)
 * @access  Private
 */
router.put('/folders/:folderId', protect, getFolderWithAccess, async (req, res) => {
  try {
    const folder = req.folder;
    const { name } = req.body;

    // Get the card to check permissions
    const card = await Card.findById(folder.cardId);
    const hasPermission = await card.hasPermission(req.user.id, 'write', req.user.role);

    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to update this folder'
      });
    }

    // Validation
    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Folder name is required'
      });
    }

    // Check for duplicate folder name in same location
    const existingFolder = await Folder.findOne({
      _id: { $ne: folder._id },
      cardId: folder.cardId,
      name: name.trim(),
      parentFolder: folder.parentFolder,
      isDeleted: false
    });

    if (existingFolder) {
      return res.status(400).json({
        success: false,
        message: 'A folder with this name already exists in this location'
      });
    }

    folder.name = name.trim();
    await folder.save();

    res.status(200).json({
      success: true,
      data: folder,
      message: 'Folder renamed successfully'
    });
  } catch (error) {
    console.error('Update folder error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating folder'
    });
  }
});

/**
 * @route   DELETE /api/folders/:folderId
 * @desc    Delete folder (soft delete, cascades to subfolders and files)
 * @access  Private
 */
router.delete('/folders/:folderId', protect, getFolderWithAccess, async (req, res) => {
  try {
    const folder = req.folder;

    // Get the card to check permissions
    const card = await Card.findById(folder.cardId);
    const hasPermission = await card.hasPermission(req.user.id, 'delete', req.user.role);

    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to delete this folder'
      });
    }

    // Mark folder as deleted
    folder.isDeleted = true;
    await folder.save();

    // Get all subfolders and mark as deleted
    const subfolders = await folder.getAllSubfolders();
    for (const subfolder of subfolders) {
      subfolder.isDeleted = true;
      await subfolder.save();
    }

    // Mark all files in this folder and subfolders as deleted
    const folderIds = [folder._id, ...subfolders.map(f => f._id)];

    // Update attachments in card to mark as deleted
    await Card.updateMany(
      {
        _id: folder.cardId,
        'attachments.folderId': { $in: folderIds }
      },
      {
        $set: { 'attachments.$[elem].isDeleted': true }
      },
      {
        arrayFilters: [{ 'elem.folderId': { $in: folderIds } }]
      }
    );

    res.status(200).json({
      success: true,
      message: 'Folder and its contents deleted successfully'
    });
  } catch (error) {
    console.error('Delete folder error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting folder'
    });
  }
});

/**
 * @route   GET /api/folders/:folderId/breadcrumb
 * @desc    Get breadcrumb path for folder
 * @access  Private
 */
router.get('/folders/:folderId/breadcrumb', protect, getFolderWithAccess, async (req, res) => {
  try {
    const folder = req.folder;
    const breadcrumb = [];

    let currentFolder = folder;
    breadcrumb.unshift({
      _id: currentFolder._id,
      name: currentFolder.name
    });

    while (currentFolder.parentFolder) {
      currentFolder = await Folder.findById(currentFolder.parentFolder);
      if (currentFolder && !currentFolder.isDeleted) {
        breadcrumb.unshift({
          _id: currentFolder._id,
          name: currentFolder.name
        });
      } else {
        break;
      }
    }

    res.status(200).json({
      success: true,
      data: breadcrumb
    });
  } catch (error) {
    console.error('Get breadcrumb error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching breadcrumb'
    });
  }
});

module.exports = router;
