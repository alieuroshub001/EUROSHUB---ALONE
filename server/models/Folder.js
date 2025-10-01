const mongoose = require('mongoose');

const folderSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Folder name is required'],
    trim: true,
    maxlength: [100, 'Folder name cannot be more than 100 characters']
  },
  cardId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Card',
    required: [true, 'Card reference is required']
  },
  parentFolder: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Folder',
    default: null // null means root level folder
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isDeleted: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for getting all files in this folder
folderSchema.virtual('files', {
  ref: 'Card',
  localField: '_id',
  foreignField: 'attachments.folderId'
});

// Instance method to get full path
folderSchema.methods.getPath = async function() {
  const path = [this.name];
  let currentFolder = this;

  while (currentFolder.parentFolder) {
    currentFolder = await this.constructor.findById(currentFolder.parentFolder);
    if (currentFolder) {
      path.unshift(currentFolder.name);
    } else {
      break;
    }
  }

  return path.join('/');
};

// Instance method to check if user has access to this folder
folderSchema.methods.hasAccess = async function(userId, userRole) {
  const Card = mongoose.model('Card');
  const card = await Card.findById(this.cardId);

  if (!card) return false;
  return await card.hasAccess(userId, userRole);
};

// Instance method to get all subfolders recursively
folderSchema.methods.getAllSubfolders = async function() {
  const subfolders = await this.constructor.find({ parentFolder: this._id, isDeleted: false });
  let allSubfolders = [...subfolders];

  for (const subfolder of subfolders) {
    const nestedSubfolders = await subfolder.getAllSubfolders();
    allSubfolders = [...allSubfolders, ...nestedSubfolders];
  }

  return allSubfolders;
};

// Pre-remove middleware to handle cascade deletion
folderSchema.pre('deleteOne', { document: true, query: false }, async function(next) {
  try {
    // Get all subfolders
    const subfolders = await this.getAllSubfolders();

    // Mark all subfolders as deleted
    for (const subfolder of subfolders) {
      subfolder.isDeleted = true;
      await subfolder.save();
    }

    // Mark all files in this folder and subfolders as deleted
    const Card = mongoose.model('Card');
    const folderIds = [this._id, ...subfolders.map(f => f._id)];

    await Card.updateMany(
      { 'attachments.folderId': { $in: folderIds } },
      { $set: { 'attachments.$[elem].isDeleted': true } },
      { arrayFilters: [{ 'elem.folderId': { $in: folderIds } }] }
    );

    next();
  } catch (error) {
    next(error);
  }
});

// Indexes for performance
folderSchema.index({ cardId: 1, parentFolder: 1 });
folderSchema.index({ cardId: 1, name: 1, parentFolder: 1 });
folderSchema.index({ createdBy: 1 });
folderSchema.index({ isDeleted: 1 });

// Compound index for folder tree queries
folderSchema.index({
  cardId: 1,
  isDeleted: 1,
  parentFolder: 1
});

module.exports = mongoose.model('Folder', folderSchema);
