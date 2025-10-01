const express = require('express');
const router = express.Router();
const Card = require('../models/Card');
const Activity = require('../models/Activity');
const { protect } = require('../middleware/auth');

/**
 * @route   POST /api/cards/:cardId/comments
 * @desc    Add comment to card
 * @access  Private
 */
router.post('/cards/:cardId/comments', protect, async (req, res) => {
  try {
    const { text, mentions } = req.body;
    const { cardId } = req.params;

    // Find the card
    const card = await Card.findById(cardId);
    if (!card) {
      return res.status(404).json({
        success: false,
        message: 'Card not found'
      });
    }

    // Check if user has access to the card
    const hasAccess = await card.hasAccess(req.user.id, req.user.role);
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this card'
      });
    }

    // Create comment
    const comment = {
      text: text.trim(),
      author: req.user.id,
      mentions: mentions || [],
      isEdited: false
    };

    card.comments.push(comment);
    await card.save();

    // Populate the new comment
    await card.populate({
      path: 'comments.author',
      select: 'firstName lastName avatar email'
    });

    // Get the newly added comment
    const newComment = card.comments[card.comments.length - 1];

    // Log activity
    if (card.board) {
      await Activity.logActivity({
        type: 'card_comment_added',
        user: req.user.id,
        project: card.project,
        board: card.board,
        card: card._id,
        data: {
          comment: text.substring(0, 100)
        }
      });
    }

    res.status(201).json({
      success: true,
      data: newComment,
      message: 'Comment added successfully'
    });
  } catch (error) {
    console.error('Add comment error:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding comment'
    });
  }
});

/**
 * @route   GET /api/cards/:cardId/comments
 * @desc    Get all comments for a card
 * @access  Private
 */
router.get('/cards/:cardId/comments', protect, async (req, res) => {
  try {
    const { cardId } = req.params;

    const card = await Card.findById(cardId)
      .populate({
        path: 'comments.author',
        select: 'firstName lastName avatar email'
      })
      .populate({
        path: 'comments.mentions',
        select: 'firstName lastName'
      })
      .populate({
        path: 'comments.reactions.user',
        select: 'firstName lastName avatar'
      });

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
        message: 'Access denied to this card'
      });
    }

    // Filter out deleted comments
    const activeComments = card.comments.filter(comment => !comment.isDeleted);

    res.status(200).json({
      success: true,
      data: activeComments
    });
  } catch (error) {
    console.error('Get comments error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching comments'
    });
  }
});

/**
 * @route   PUT /api/comments/:commentId
 * @desc    Edit comment
 * @access  Private
 */
router.put('/comments/:commentId', protect, async (req, res) => {
  try {
    const { commentId } = req.params;
    const { text, cardId } = req.body;

    const card = await Card.findById(cardId);
    if (!card) {
      return res.status(404).json({
        success: false,
        message: 'Card not found'
      });
    }

    const comment = card.comments.id(commentId);
    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found'
      });
    }

    // Check if user is the comment author
    if (comment.author.toString() !== req.user.id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only edit your own comments'
      });
    }

    // Update comment
    comment.text = text.trim();
    comment.isEdited = true;
    comment.editedAt = new Date();

    await card.save();

    // Populate the comment
    await card.populate({
      path: 'comments.author',
      select: 'firstName lastName avatar email'
    });

    const updatedComment = card.comments.id(commentId);

    // Log activity
    if (card.board) {
      await Activity.logActivity({
        type: 'card_comment_edited',
        user: req.user.id,
        project: card.project,
        board: card.board,
        card: card._id
      });
    }

    res.status(200).json({
      success: true,
      data: updatedComment,
      message: 'Comment updated successfully'
    });
  } catch (error) {
    console.error('Edit comment error:', error);
    res.status(500).json({
      success: false,
      message: 'Error editing comment'
    });
  }
});

/**
 * @route   DELETE /api/comments/:commentId
 * @desc    Delete comment (soft delete)
 * @access  Private
 */
router.delete('/comments/:commentId', protect, async (req, res) => {
  try {
    const { commentId } = req.params;
    const { cardId } = req.query;

    const card = await Card.findById(cardId);
    if (!card) {
      return res.status(404).json({
        success: false,
        message: 'Card not found'
      });
    }

    const comment = card.comments.id(commentId);
    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found'
      });
    }

    // Check permissions
    const hasPermission = await card.hasPermission(req.user.id, 'delete', req.user.role);
    const isAuthor = comment.author.toString() === req.user.id.toString();

    if (!hasPermission && !isAuthor) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to delete this comment'
      });
    }

    // Soft delete
    comment.isDeleted = true;
    await card.save();

    // Log activity
    if (card.board) {
      await Activity.logActivity({
        type: 'card_comment_deleted',
        user: req.user.id,
        project: card.project,
        board: card.board,
        card: card._id
      });
    }

    res.status(200).json({
      success: true,
      message: 'Comment deleted successfully'
    });
  } catch (error) {
    console.error('Delete comment error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting comment'
    });
  }
});

/**
 * @route   POST /api/comments/:commentId/reactions
 * @desc    Add reaction to comment
 * @access  Private
 */
router.post('/comments/:commentId/reactions', protect, async (req, res) => {
  try {
    const { commentId } = req.params;
    const { emoji, cardId } = req.body;

    const card = await Card.findById(cardId);
    if (!card) {
      return res.status(404).json({
        success: false,
        message: 'Card not found'
      });
    }

    const comment = card.comments.id(commentId);
    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found'
      });
    }

    // Check if user already reacted with this emoji
    const existingReaction = comment.reactions.find(
      r => r.user.toString() === req.user.id.toString() && r.emoji === emoji
    );

    if (existingReaction) {
      return res.status(400).json({
        success: false,
        message: 'You already reacted with this emoji'
      });
    }

    // Add reaction
    comment.reactions.push({
      emoji,
      user: req.user.id
    });

    await card.save();

    // Populate reactions
    await card.populate({
      path: 'comments.reactions.user',
      select: 'firstName lastName avatar'
    });

    const updatedComment = card.comments.id(commentId);

    // Log activity
    if (card.board) {
      await Activity.logActivity({
        type: 'card_comment_reacted',
        user: req.user.id,
        project: card.project,
        board: card.board,
        card: card._id,
        data: {
          emoji
        }
      });
    }

    res.status(200).json({
      success: true,
      data: updatedComment.reactions,
      message: 'Reaction added successfully'
    });
  } catch (error) {
    console.error('Add reaction error:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding reaction'
    });
  }
});

/**
 * @route   DELETE /api/comments/:commentId/reactions/:emoji
 * @desc    Remove reaction from comment
 * @access  Private
 */
router.delete('/comments/:commentId/reactions/:emoji', protect, async (req, res) => {
  try {
    const { commentId, emoji } = req.params;
    const { cardId } = req.query;

    const card = await Card.findById(cardId);
    if (!card) {
      return res.status(404).json({
        success: false,
        message: 'Card not found'
      });
    }

    const comment = card.comments.id(commentId);
    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found'
      });
    }

    // Find and remove the reaction
    const reactionIndex = comment.reactions.findIndex(
      r => r.user.toString() === req.user.id.toString() && r.emoji === decodeURIComponent(emoji)
    );

    if (reactionIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Reaction not found'
      });
    }

    comment.reactions.splice(reactionIndex, 1);
    await card.save();

    res.status(200).json({
      success: true,
      message: 'Reaction removed successfully'
    });
  } catch (error) {
    console.error('Remove reaction error:', error);
    res.status(500).json({
      success: false,
      message: 'Error removing reaction'
    });
  }
});

module.exports = router;
