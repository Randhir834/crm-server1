const mongoose = require('mongoose');

const chatMessageSchema = new mongoose.Schema({
  sender: {
    type: String,
    enum: ['user', 'lead', 'customer'],
    required: true
  },
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'senderModel',
    required: true
  },
  senderModel: {
    type: String,
    enum: ['User', 'Lead', 'Customer'],
    required: true
  },
  content: {
    type: String,
    required: true,
    trim: true
  },
  messageType: {
    type: String,
    enum: ['text', 'file', 'image'],
    default: 'text'
  },
  fileUrl: {
    type: String,
    trim: true
  },
  isRead: {
    type: Boolean,
    default: false
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

const chatSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  participantId: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'participantModel',
    required: true
  },
  participantModel: {
    type: String,
    enum: ['Lead', 'Customer'],
    required: true
  },
  participantName: {
    type: String,
    required: true
  },

  callScheduleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CallSchedule',
    required: false
  },
  messages: [chatMessageSchema],
  lastMessage: {
    type: Date,
    default: Date.now
  },
  isActive: {
    type: Boolean,
    default: true
  },
  unreadCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Index for efficient querying
chatSchema.index({ userId: 1, participantId: 1 });
chatSchema.index({ lastMessage: -1 });
chatSchema.index({ isActive: 1 });

// Virtual for getting the latest message
chatSchema.virtual('latestMessage').get(function() {
  if (this.messages.length > 0) {
    return this.messages[this.messages.length - 1];
  }
  return null;
});

// Method to add a new message
chatSchema.methods.addMessage = function(messageData) {
  this.messages.push(messageData);
  this.lastMessage = new Date();
  
  // Update unread count if message is from participant
  if (messageData.sender === 'lead' || messageData.sender === 'customer') {
    this.unreadCount += 1;
  }
  
  return this.save();
};

// Method to mark messages as read
chatSchema.methods.markAsRead = function() {
  this.messages.forEach(message => {
    if (message.sender === 'lead' || message.sender === 'customer') {
      message.isRead = true;
    }
  });
  this.unreadCount = 0;
  return this.save();
};

// Static method to find or create chat
chatSchema.statics.findOrCreateChat = async function(userId, participantId, participantModel, participantName, callScheduleId = null) {
  let chat = await this.findOne({
    userId,
    participantId,
    participantModel,
    isActive: true
  });

  if (!chat) {
    chat = new this({
      userId,
      participantId,
      participantModel,
      participantName,

      callScheduleId
    });
    await chat.save();
  }

  return chat;
};

// Static method to get chats for a user
chatSchema.statics.getUserChats = function(userId) {
  return this.find({ userId, isActive: true })
    .sort({ lastMessage: -1 })
    .populate('participantId', 'name')
    .populate('callScheduleId', 'scheduledDate scheduledTime status');
};

module.exports = mongoose.model('Chat', chatSchema); 