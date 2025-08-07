const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  loginTime: {
    type: Date,
    required: true,
    default: Date.now
  },
  logoutTime: {
    type: Date,
    default: null
  },
  duration: {
    type: Number, // in milliseconds
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  },
  userAgent: {
    type: String,
    default: null
  },
  ipAddress: {
    type: String,
    default: null
  }
}, {
  timestamps: true,
  collection: 'sessions'
});

// Create indexes for better performance
sessionSchema.index({ userId: 1, isActive: 1 });
sessionSchema.index({ loginTime: -1 });
sessionSchema.index({ logoutTime: -1 });

// Method to calculate session duration
sessionSchema.methods.calculateDuration = function() {
  if (this.logoutTime && this.loginTime) {
    this.duration = this.logoutTime.getTime() - this.loginTime.getTime();
  }
  return this.duration;
};

// Method to end session
sessionSchema.methods.endSession = function() {
  this.logoutTime = new Date();
  this.isActive = false;
  this.calculateDuration();
  return this.save();
};

// Static method to get user's current session
sessionSchema.statics.getCurrentSession = function(userId) {
  return this.findOne({ userId: new mongoose.Types.ObjectId(userId), isActive: true });
};

// Static method to get user's session history
sessionSchema.statics.getUserSessions = function(userId, limit = 10) {
  return this.find({ userId: new mongoose.Types.ObjectId(userId) })
    .sort({ loginTime: -1 })
    .limit(limit);
};

// Static method to get user's total session time
sessionSchema.statics.getTotalSessionTime = function(userId) {
  return this.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(userId), logoutTime: { $ne: null } } },
    { $group: { _id: null, totalDuration: { $sum: '$duration' } } }
  ]);
};

module.exports = mongoose.model('Session', sessionSchema);