const mongoose = require('mongoose');

const projectMemberSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  role: {
    type: String,
    enum: ['project_manager', 'developer', 'designer', 'tester', 'viewer', 'client_viewer'],
    required: true
  },
  joinedAt: {
    type: Date,
    default: Date.now
  },
  addedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  _id: true,
  timestamps: true
});

const projectSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Project title is required'],
    trim: true,
    maxlength: [200, 'Project title cannot be more than 200 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [2000, 'Project description cannot be more than 2000 characters']
  },
  status: {
    type: String,
    enum: ['planning', 'active', 'on_hold', 'completed', 'cancelled'],
    default: 'planning'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  startDate: {
    type: Date,
    required: [true, 'Start date is required']
  },
  endDate: {
    type: Date,
    validate: {
      validator: function(value) {
        return !value || value > this.startDate;
      },
      message: 'End date must be after start date'
    }
  },
  estimatedHours: {
    type: Number,
    min: [0, 'Estimated hours cannot be negative'],
    default: 0
  },
  actualHours: {
    type: Number,
    min: [0, 'Actual hours cannot be negative'],
    default: 0
  },
  budget: {
    amount: {
      type: Number,
      min: [0, 'Budget amount cannot be negative'],
      default: 0
    },
    currency: {
      type: String,
      enum: ['USD', 'EUR', 'GBP', 'PKR'],
      default: 'USD'
    }
  },
  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  members: [projectMemberSchema],
  tags: [{
    type: String,
    trim: true,
    maxlength: [50, 'Tag cannot be more than 50 characters']
  }],
  isArchived: {
    type: Boolean,
    default: false
  },
  visibility: {
    type: String,
    enum: ['private', 'team', 'company'],
    default: 'team'
  },
  metadata: {
    totalTasks: { type: Number, default: 0 },
    completedTasks: { type: Number, default: 0 },
    totalBoards: { type: Number, default: 0 }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for completion percentage
projectSchema.virtual('completionPercentage').get(function() {
  if (this.metadata.totalTasks === 0) return 0;
  return Math.round((this.metadata.completedTasks / this.metadata.totalTasks) * 100);
});

// Virtual for project boards
projectSchema.virtual('boards', {
  ref: 'Board',
  localField: '_id',
  foreignField: 'project'
});

// Virtual for checking if project is overdue
projectSchema.virtual('isOverdue').get(function() {
  return this.endDate && this.endDate < new Date() && this.status !== 'completed';
});

// Static method to check if user can create projects
projectSchema.statics.canUserCreate = function(userRole) {
  const allowedRoles = ['superadmin', 'admin', 'hr'];
  return allowedRoles.includes(userRole);
};

// Static method to get role-based project access levels
projectSchema.statics.getRolePermissions = function(userRole) {
  const rolePermissions = {
    'superadmin': {
      canCreate: true,
      canViewAll: true,
      canEditAll: true,
      canDeleteAll: true,
      canManageAllMembers: true,
      canOverridePermissions: true
    },
    'admin': {
      canCreate: true,
      canViewAll: true, // Can view all company projects
      canEditAll: true, // Can edit all company projects
      canDeleteAll: true, // Can delete all company projects
      canManageAllMembers: true,
      canOverridePermissions: false
    },
    'hr': {
      canCreate: true,
      canViewAll: true, // Can view projects for resource planning
      canEditAll: false, // Can only edit own projects or projects they manage
      canDeleteAll: false,
      canManageAllMembers: true, // Can manage project members for team allocation
      canOverridePermissions: false
    },
    'employee': {
      canCreate: false,
      canViewAll: false, // Can only view assigned projects
      canEditAll: false,
      canDeleteAll: false,
      canManageAllMembers: false,
      canOverridePermissions: false
    },
    'client': {
      canCreate: false,
      canViewAll: false, // Can only view projects they're assigned to
      canEditAll: false,
      canDeleteAll: false,
      canManageAllMembers: false,
      canOverridePermissions: false
    }
  };

  return rolePermissions[userRole] || rolePermissions.employee;
};

// Instance method to check if user has permission for specific action
projectSchema.methods.hasPermission = function(userId, action, userRole = null) {
  const userIdStr = userId.toString();

  // If user role is provided, check role-based permissions first
  if (userRole) {
    const rolePermissions = this.constructor.getRolePermissions(userRole);

    // Superadmin and admin override all permissions
    if (['superadmin', 'admin'].includes(userRole)) {
      return true;
    }

    // HR can perform certain actions on all projects
    if (userRole === 'hr') {
      const hrAllowedActions = ['read', 'manage_members'];
      if (hrAllowedActions.includes(action)) return true;
    }
  }

  // Owner has all permissions
  if (this.owner.toString() === userIdStr) return true;

  // Find user's role in project
  const member = this.members.find(m => m.user.toString() === userIdStr);
  if (!member) return false;

  const permissions = {
    'project_manager': ['read', 'write', 'delete', 'manage_members', 'manage_boards'],
    'developer': ['read', 'write', 'update_tasks'],
    'designer': ['read', 'write', 'update_tasks'],
    'tester': ['read', 'write', 'update_tasks'],
    'viewer': ['read'],
    'client_viewer': ['read']
  };

  return permissions[member.role]?.includes(action) || false;
};

// Instance method to add member with role validation
projectSchema.methods.addMember = function(userId, role, addedByUserId, addedByUserRole) {
  // Check if user is already a member
  if (this.members.some(m => m.user.toString() === userId.toString())) {
    throw new Error('User is already a member of this project');
  }

  // Role-based restrictions for adding members
  const canAddRole = {
    'superadmin': ['project_manager', 'developer', 'designer', 'tester', 'viewer', 'client_viewer'],
    'admin': ['project_manager', 'developer', 'designer', 'tester', 'viewer', 'client_viewer'],
    'hr': ['project_manager', 'developer', 'designer', 'tester', 'viewer', 'client_viewer'], // HR can add any role for team management
    'project_manager': ['developer', 'designer', 'tester', 'viewer', 'client_viewer']
  };

  if (!canAddRole[addedByUserRole]?.includes(role)) {
    throw new Error(`${addedByUserRole} cannot add members with role ${role}`);
  }

  this.members.push({
    user: userId,
    role: role,
    addedBy: addedByUserId
  });

  return this;
};

// Instance method to remove member
projectSchema.methods.removeMember = function(userId, removedByUserRole) {
  const memberIndex = this.members.findIndex(m => m.user.toString() === userId.toString());
  if (memberIndex === -1) {
    throw new Error('User is not a member of this project');
  }

  const member = this.members[memberIndex];

  // Only certain roles can remove members
  const canRemoveRoles = ['superadmin', 'admin', 'hr', 'project_manager'];
  if (!canRemoveRoles.includes(removedByUserRole)) {
    throw new Error(`${removedByUserRole} cannot remove project members`);
  }

  // Project managers cannot remove other project managers unless they are superadmin/admin
  if (member.role === 'project_manager' && removedByUserRole === 'project_manager') {
    throw new Error('Project managers cannot remove other project managers');
  }

  this.members.splice(memberIndex, 1);
  return this;
};

// Instance method to update member role
projectSchema.methods.updateMemberRole = function(userId, newRole, updatedByUserRole) {
  const member = this.members.find(m => m.user.toString() === userId.toString());
  if (!member) {
    throw new Error('User is not a member of this project');
  }

  // Role update permissions
  const canUpdateRoles = ['superadmin', 'admin', 'hr', 'project_manager'];
  if (!canUpdateRoles.includes(updatedByUserRole)) {
    throw new Error(`${updatedByUserRole} cannot update member roles`);
  }

  // Validate new role permissions
  const canAssignRole = {
    'superadmin': ['project_manager', 'developer', 'designer', 'tester', 'viewer', 'client_viewer'],
    'admin': ['project_manager', 'developer', 'designer', 'tester', 'viewer', 'client_viewer'],
    'hr': ['project_manager', 'developer', 'designer', 'tester', 'viewer', 'client_viewer'], // HR can assign any role for team management
    'project_manager': ['developer', 'designer', 'tester', 'viewer', 'client_viewer']
  };

  if (!canAssignRole[updatedByUserRole]?.includes(newRole)) {
    throw new Error(`${updatedByUserRole} cannot assign role ${newRole}`);
  }

  member.role = newRole;
  return this;
};

// Pre-save middleware to update metadata
projectSchema.pre('save', async function(next) {
  if (this.isNew) {
    // Set default metadata for new projects
    this.metadata = {
      totalTasks: 0,
      completedTasks: 0,
      totalBoards: 0
    };
  }
  next();
});

// Indexes for performance
projectSchema.index({ owner: 1, status: 1 });
projectSchema.index({ 'members.user': 1 });
projectSchema.index({ client: 1 });
projectSchema.index({ status: 1, priority: 1 });
projectSchema.index({ startDate: 1, endDate: 1 });
projectSchema.index({ tags: 1 });
projectSchema.index({ createdAt: -1 });
projectSchema.index({ isArchived: 1 });

// Compound index for efficient querying
projectSchema.index({
  status: 1,
  'members.user': 1,
  isArchived: 1
});

module.exports = mongoose.model('Project', projectSchema);