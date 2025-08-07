const express = require('express');
const { body } = require('express-validator');
const chatController = require('../controllers/chatController');
const auth = require('../middleware/auth');

const router = express.Router();



// Apply auth middleware to all routes
router.use(auth);

// @route   GET /api/chats
// @desc    Get all chats for a user
// @access  Private
router.get('/', chatController.getChats);

// @route   GET /api/chats/:id
// @desc    Get a specific chat by ID
// @access  Private
router.get('/:id', chatController.getChatById);

// @route   POST /api/chats
// @desc    Create or get chat for a lead/customer
// @access  Private
router.post('/', [
  body('participantId').isMongoId().withMessage('Invalid participant ID'),
  body('participantModel').isIn(['Lead', 'Customer']).withMessage('Invalid participant model'),
  body('callScheduleId').optional().isMongoId().withMessage('Invalid call schedule ID')
], chatController.createChat);

// @route   POST /api/chats/:id/messages
// @desc    Send a message in a chat
// @access  Private
router.post('/:id/messages', [
  body('content').trim().isLength({ min: 1, max: 1000 }).withMessage('Message content must be between 1 and 1000 characters'),
  body('messageType').optional().isIn(['text', 'file', 'image']).withMessage('Invalid message type'),
  body('fileUrl').optional().isURL().withMessage('Invalid file URL')
], chatController.sendMessage);

// @route   PATCH /api/chats/:id/read
// @desc    Mark chat messages as read
// @access  Private
router.patch('/:id/read', chatController.markAsRead);

// @route   GET /api/chats/call-schedule/:callScheduleId
// @desc    Get chat for a specific call schedule
// @access  Private
router.get('/call-schedule/:callScheduleId', chatController.getChatByCallSchedule);

// @route   DELETE /api/chats/:id
// @desc    Delete a chat (soft delete)
// @access  Private
router.delete('/:id', chatController.deleteChat);

module.exports = router; 