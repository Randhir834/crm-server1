const mongoose = require('mongoose');

const leadSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    minlength: [2, 'Name must be at least 2 characters long'],
    maxlength: [100, 'Name cannot exceed 100 characters']
  },

  phone: {
    type: String,
    trim: true,
    default: ''
  },

  status: {
    type: String,
    enum: ['New', 'Qualified', 'Negotiation', 'Closed', 'Lost'],
    default: 'New'
  },
  source: {
    type: String,
    trim: true,
    default: 'Import'
  },
  notes: {
    type: String,
    trim: true,
    default: ''
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  lastContacted: {
    type: Date,
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  collection: 'leads'
});

// Create indexes for better performance

leadSchema.index({ status: 1 });

leadSchema.index({ createdAt: -1 });
leadSchema.index({ createdBy: 1 });
leadSchema.index({ assignedTo: 1 });
leadSchema.index({ isActive: 1 });

// Method to get lead without sensitive fields
leadSchema.methods.toJSON = function() {
  const lead = this.toObject();
  return lead;
};

// Static method to find leads by status
leadSchema.statics.findByStatus = function(status) {
  return this.find({ status, isActive: true });
};



// Static method to get leads statistics
leadSchema.statics.getStats = function() {
  return this.aggregate([
    { $match: { isActive: true } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);
};

module.exports = mongoose.model('Lead', leadSchema); 