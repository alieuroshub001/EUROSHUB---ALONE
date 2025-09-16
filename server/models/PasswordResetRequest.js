const mongoose = require('mongoose');

const passwordResetRequestSchema = new mongoose.Schema({
  userEmail: {
    type: String,
    required: true,
    lowercase: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  requestedBy: {
    firstName: String,
    lastName: String,
    email: String
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'completed'],
    default: 'pending'
  },
  requestedAt: {
    type: Date,
    default: Date.now
  },
  processedAt: {
    type: Date
  },
  processedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  processorInfo: {
    firstName: String,
    lastName: String,
    email: String,
    role: String
  },
  notes: {
    type: String,
    maxlength: 500
  },
  newPassword: {
    type: String
  },
  emailSent: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Index for efficient querying
passwordResetRequestSchema.index({ status: 1, requestedAt: -1 });
passwordResetRequestSchema.index({ userEmail: 1, status: 1 });

// Virtual for request age
passwordResetRequestSchema.virtual('requestAge').get(function() {
  const now = new Date();
  const requested = new Date(this.requestedAt);
  const diffTime = Math.abs(now - requested);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
});

// Method to check if request is expired (optional - for auto-cleanup)
passwordResetRequestSchema.methods.isExpired = function() {
  const expiryDays = 7; // Requests expire after 7 days
  return this.requestAge > expiryDays;
};

// Static method to get pending requests for admins
passwordResetRequestSchema.statics.getPendingRequests = function(adminRole) {
  const query = { status: 'pending' };

  // HR can only see employee requests, Admin can see all except superadmin
  if (adminRole === 'hr') {
    // HR logic would need user role info - we'll populate user
    return this.find(query)
      .populate('userId', 'role firstName lastName email')
      .populate('processedBy', 'firstName lastName email role')
      .sort({ requestedAt: -1 });
  } else if (adminRole === 'admin') {
    return this.find(query)
      .populate('userId', 'role firstName lastName email')
      .populate('processedBy', 'firstName lastName email role')
      .sort({ requestedAt: -1 });
  } else if (adminRole === 'superadmin') {
    return this.find(query)
      .populate('userId', 'role firstName lastName email')
      .populate('processedBy', 'firstName lastName email role')
      .sort({ requestedAt: -1 });
  }

  return this.find({ _id: null }); // Return empty for other roles
};

module.exports = mongoose.model('PasswordResetRequest', passwordResetRequestSchema);