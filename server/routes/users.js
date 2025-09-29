const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { protect } = require('../middleware/auth');

/**
 * @route   GET /api/users
 * @desc    Get all users (for member assignment)
 * @access  Private
 */
router.get('/', protect, async (req, res) => {
  try {
    // Only return basic user info needed for member assignment
    const users = await User.find({ isActive: true })
      .select('firstName lastName email avatar role')
      .sort({ firstName: 1, lastName: 1 });

    res.status(200).json({
      success: true,
      data: users
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching users'
    });
  }
});

/**
 * @route   GET /api/users/search
 * @desc    Search users by name or email
 * @access  Private
 */
router.get('/search', protect, async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || q.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Search query must be at least 2 characters long'
      });
    }

    const searchRegex = new RegExp(q.trim(), 'i');

    const users = await User.find({
      isActive: true,
      $or: [
        { firstName: searchRegex },
        { lastName: searchRegex },
        { email: searchRegex },
        {
          $expr: {
            $regexMatch: {
              input: { $concat: ['$firstName', ' ', '$lastName'] },
              regex: q.trim(),
              options: 'i'
            }
          }
        }
      ]
    })
    .select('firstName lastName email avatar role')
    .sort({ firstName: 1, lastName: 1 })
    .limit(50); // Limit results to prevent too much data

    res.status(200).json({
      success: true,
      data: users
    });
  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({
      success: false,
      message: 'Error searching users'
    });
  }
});

module.exports = router;