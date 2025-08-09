const { validationResult } = require('express-validator');
const Chat = require('../models/Chat');
const Lead = require('../models/Lead');
const Customer = require('../models/Customer');
const CallSchedule = require('../models/CallSchedule');

// @desc    Get all chats for a user
// @route   GET /api/chats
// @access  Private
const getChats = async (req, res) => {
  try {
    let chats;
    
    // If user is admin, get all chats, otherwise get only user's chats
    if (req.user.role === 'admin') {
      chats = await Chat.find({ isActive: true })
        .populate('userId', 'name ')
        .populate('participantId', 'name')
        .populate('callScheduleId', 'scheduledDate scheduledTime status')
        .sort({ lastMessage: -1 });
    } else {
      chats = await Chat.getUserChats(req.user._id);
    }
    
    res.json({
      success: true,
      count: chats.length,
      chats
    });
  } catch (error) {
    console.error('❌ Get chats error:', error);
    res.status(500).json({ message: 'Server error while fetching chats' });
  }
};

// @desc    Get a specific chat by ID
// @route   GET /api/chats/:id
// @access  Private
const getChatById = async (req, res) => {
  try {
    const chat = await Chat.findOne({
      _id: req.params.id,
      userId: req.user._id,
      isActive: true
    }).populate('participantId', 'name')
      .populate('callScheduleId', 'scheduledDate scheduledTime status');

    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    // Mark messages as read
    await chat.markAsRead();

    res.json({
      success: true,
      chat
    });
  } catch (error) {
    console.error('❌ Get chat by ID error:', error);
    res.status(500).json({ message: 'Server error while fetching chat' });
  }
};

// @desc    Create or get chat for a lead/customer
// @route   POST /api/chats
// @access  Private
const createChat = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { participantId, participantModel, callScheduleId } = req.body;

    // Validate participant model
    if (!['Lead', 'Customer'].includes(participantModel)) {
      return res.status(400).json({ message: 'Invalid participant model' });
    }

    // Find the participant
    let participant;
    if (participantModel === 'Lead') {
      participant = await Lead.findOne({
        _id: participantId,
        createdBy: req.user._id
      });
    } else {
      participant = await Customer.findOne({
        _id: participantId,
        userId: req.user._id
      });
    }

    if (!participant) {
      return res.status(404).json({ message: 'Participant not found' });
    }

    // Validate call schedule if provided
    let callSchedule = null;
    if (callScheduleId) {
      callSchedule = await CallSchedule.findOne({
        _id: callScheduleId,
        scheduledBy: req.user._id
      });
      if (!callSchedule) {
        return res.status(404).json({ message: 'Call schedule not found' });
      }
    }

    // Find or create chat
    const chat = await Chat.findOrCreateChat(
      req.user._id,
      participantId,
      participantModel,
      participant.name,

      callScheduleId
    );

    // Populate the chat data
    await chat.populate('participantId', 'name');
    if (callScheduleId) {
      await chat.populate('callScheduleId', 'scheduledDate scheduledTime status');
    }

    res.json({
      success: true,
      message: 'Chat created/retrieved successfully',
      chat
    });
  } catch (error) {
    console.error('❌ Create chat error:', error);
    res.status(500).json({ message: 'Server error while creating chat' });
  }
};

// @desc    Send a message in a chat
// @route   POST /api/chats/:id/messages
// @access  Private
const sendMessage = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { content, messageType = 'text', fileUrl } = req.body;

    const chat = await Chat.findOne({
      _id: req.params.id,
      userId: req.user._id,
      isActive: true
    });

    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    // Create message data
    const messageData = {
      sender: 'user',
      senderId: req.user._id,
      senderModel: 'User',
      content,
      messageType,
      fileUrl: fileUrl || null,
      timestamp: new Date()
    };

    // Add message to chat
    await chat.addMessage(messageData);

    // Populate the updated chat
    await chat.populate('participantId', 'name');
    await chat.populate('callScheduleId', 'scheduledDate scheduledTime status');

    res.json({
      success: true,
      message: 'Message sent successfully',
      chat
    });
  } catch (error) {
    console.error('❌ Send message error:', error);
    res.status(500).json({ message: 'Server error while sending message' });
  }
};

// @desc    Mark chat messages as read
// @route   PATCH /api/chats/:id/read
// @access  Private
const markAsRead = async (req, res) => {
  try {
    const chat = await Chat.findOne({
      _id: req.params.id,
      userId: req.user._id,
      isActive: true
    });

    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    await chat.markAsRead();

    res.json({
      success: true,
      message: 'Messages marked as read'
    });
  } catch (error) {
    console.error('❌ Mark as read error:', error);
    res.status(500).json({ message: 'Server error while marking messages as read' });
  }
};

// @desc    Get chat for a specific call schedule
// @route   GET /api/chats/call-schedule/:callScheduleId
// @access  Private
const getChatByCallSchedule = async (req, res) => {
  try {
    const { callScheduleId } = req.params;
    console.log('🔍 Looking for call schedule:', callScheduleId);
    console.log('👤 User ID:', req.user._id);

    // First, let's check if the call schedule exists at all
    const allCallSchedules = await CallSchedule.find({}).populate({
      path: 'leadId',
      select: 'name',
      populate: {
        path: 'createdBy',
        select: 'name '
      }
    });
    console.log('📋 All call schedules:', allCallSchedules.map(cs => ({ id: cs._id, scheduledBy: cs.scheduledBy, leadName: cs.leadId?.name })));

    // Find the call schedule
    const callSchedule = await CallSchedule.findOne({
      _id: callScheduleId,
      scheduledBy: req.user._id
    }).populate({
      path: 'leadId',
      select: 'name',
      populate: {
        path: 'createdBy',
        select: 'name '
      }
    });

    console.log('🎯 Found call schedule:', callSchedule);

    if (!callSchedule) {
      // Let's also check if it exists without user filter
      const callScheduleWithoutUser = await CallSchedule.findOne({
        _id: callScheduleId
      }).populate({
        path: 'leadId',
        select: 'name',
        populate: {
          path: 'createdBy',
          select: 'name '
        }
      });
      
      if (callScheduleWithoutUser) {
        console.log('⚠️ Call schedule exists but belongs to different user');
        return res.status(403).json({ 
          message: 'Call schedule not found for this user',
          debug: {
            callScheduleId,
            userId: req.user._id,
            callScheduleScheduledBy: callScheduleWithoutUser.scheduledBy
          }
        });
      } else {
        console.log('❌ Call schedule not found at all');
        return res.status(404).json({ 
          message: 'Call schedule not found',
          debug: { callScheduleId }
        });
      }
    }

    if (!callSchedule.leadId) {
      console.log('❌ Call schedule has no lead associated');
      return res.status(400).json({ message: 'Call schedule has no lead associated' });
    }

    console.log('✅ Call schedule found, creating chat for lead:', callSchedule.leadId.name);

    // Find or create chat for this call schedule
    const chat = await Chat.findOrCreateChat(
      req.user._id,
      callSchedule.leadId._id,
      'Lead',
      callSchedule.leadId.name,

      callScheduleId
    );

    console.log('💬 Chat created/found:', chat._id);

    // Populate the chat data
    await chat.populate('participantId', 'name');
    await chat.populate('callScheduleId', 'scheduledDate scheduledTime status');

    res.json({
      success: true,
      chat
    });
  } catch (error) {
    console.error('❌ Get chat by call schedule error:', error);
    res.status(500).json({ 
      message: 'Server error while fetching chat',
      error: error.message 
    });
  }
};

// @desc    Delete a chat (soft delete)
// @route   DELETE /api/chats/:id
// @access  Private
const deleteChat = async (req, res) => {
  try {
    console.log('🗑️ Backend: Delete chat request received');
    console.log('📋 Chat ID:', req.params.id);
    console.log('👤 User ID:', req.user._id);

    const chat = await Chat.findOne({
      _id: req.params.id,
      userId: req.user._id,
      isActive: true
    });

    if (!chat) {
      console.log('❌ Backend: Chat not found or not active');
      return res.status(404).json({ message: 'Chat not found' });
    }

    console.log('✅ Backend: Found chat to delete');
    console.log('👥 Participant:', chat.participantName);
    console.log('📅 Chat created:', chat.createdAt);

    // Soft delete - set isActive to false
    chat.isActive = false;
    await chat.save();

    console.log('✅ Backend: Chat soft deleted successfully');
    console.log('📊 Chat isActive set to:', chat.isActive);

    res.json({
      success: true,
      message: 'Chat deleted successfully from backend database'
    });
  } catch (error) {
    console.error('❌ Backend: Delete chat error:', error);
    res.status(500).json({ message: 'Server error while deleting chat' });
  }
};

module.exports = {
  getChats,
  getChatById,
  createChat,
  sendMessage,
  markAsRead,
  getChatByCallSchedule,
  deleteChat
}; 