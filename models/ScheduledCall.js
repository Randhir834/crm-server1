const mongoose = require('mongoose');

const scheduledCallSchema = new mongoose.Schema({
  leadId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lead',
    required: true
  },
  
  scheduledTime: {
    type: Date,
    required: true
  },
  
  notes: {
    type: String,
    trim: true,
    default: ''
  },
  
  status: {
    type: String,
    enum: ['pending', 'completed', 'cancelled'],
    default: 'pending'
  },
  
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  collection: 'scheduledCalls'
});

// Create indexes for better performance
scheduledCallSchema.index({ leadId: 1 });
scheduledCallSchema.index({ scheduledTime: 1 });
scheduledCallSchema.index({ status: 1 });
scheduledCallSchema.index({ createdBy: 1 });
scheduledCallSchema.index({ isActive: 1 });

// Method to get scheduled call without sensitive fields
scheduledCallSchema.methods.toJSON = function() {
  const scheduledCall = this.toObject();
  return scheduledCall;
};

// Static method to find pending scheduled calls
scheduledCallSchema.statics.findPending = function() {
  return this.find({ status: 'pending', isActive: true });
};

// Static method to find scheduled calls by lead
scheduledCallSchema.statics.findByLead = function(leadId) {
  return this.find({ leadId, isActive: true }).sort({ scheduledTime: -1 });
};

module.exports = mongoose.model('ScheduledCall', scheduledCallSchema); 