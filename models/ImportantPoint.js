const mongoose = require('mongoose');

const importantPointSchema = new mongoose.Schema({
  leadId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lead',
    required: [true, 'Lead ID is required']
  },
  
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  },
  
  content: {
    type: String,
    required: [true, 'Content is required'],
    trim: true,
    maxlength: [1000, 'Content cannot exceed 1000 characters']
  },
  
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  collection: 'important_points'
});

// Create indexes for better performance
importantPointSchema.index({ leadId: 1 });
importantPointSchema.index({ userId: 1 });
importantPointSchema.index({ createdAt: -1 });
importantPointSchema.index({ isActive: 1 });

// Method to get important point without sensitive fields
importantPointSchema.methods.toJSON = function() {
  const importantPoint = this.toObject();
  return importantPoint;
};

// Static method to find important points by lead
importantPointSchema.statics.findByLead = function(leadId) {
  return this.find({ leadId, isActive: true }).populate('userId', 'name').sort({ createdAt: -1 });
};

// Static method to find important points by user
importantPointSchema.statics.findByUser = function(userId) {
  return this.find({ userId, isActive: true }).populate('leadId', 'name').sort({ createdAt: -1 });
};

module.exports = mongoose.model('ImportantPoint', importantPointSchema); 