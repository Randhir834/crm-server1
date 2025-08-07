const mongoose = require('mongoose');

const callScheduleSchema = new mongoose.Schema({
  leadId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lead',
    required: true
  },
  scheduledBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  scheduledDate: {
    type: Date,
    required: true
  },
  scheduledTime: {
    type: String,
    required: true
  },
  duration: {
    type: Number, // in minutes
    default: 30
  },
  status: {
    type: String,
    enum: ['Scheduled', 'Completed', 'Cancelled', 'No Show'],
    default: 'Scheduled'
  },
  reminderSent: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true,
  collection: 'callSchedules'
});

// Create indexes for better performance
callScheduleSchema.index({ leadId: 1 });
callScheduleSchema.index({ scheduledBy: 1 });
callScheduleSchema.index({ scheduledDate: 1 });
callScheduleSchema.index({ status: 1 });

// Method to get call schedule without sensitive fields
callScheduleSchema.methods.toJSON = function() {
  const callSchedule = this.toObject();
  return callSchedule;
};

// Static method to find upcoming calls
callScheduleSchema.statics.findUpcoming = function(userId) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  return this.find({
    scheduledBy: userId,
    scheduledDate: { $gte: today },
    status: 'Scheduled'
  }).populate('leadId', 'name email phone company status');
};

// Static method to find calls by date range
callScheduleSchema.statics.findByDateRange = function(userId, startDate, endDate) {
  return this.find({
    scheduledBy: userId,
    scheduledDate: { $gte: startDate, $lte: endDate }
  }).populate('leadId', 'name email phone company status');
};

// Static method to get call statistics
callScheduleSchema.statics.getStats = function(userId) {
  return this.aggregate([
    { $match: { scheduledBy: mongoose.Types.ObjectId(userId) } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);
};

module.exports = mongoose.model('CallSchedule', callScheduleSchema);