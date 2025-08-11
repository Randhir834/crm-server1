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
    default: 'Manual',
    maxlength: [50, 'source cannot exceed 50 characters']
  },

  notes: {
    type: String,
    trim: true,
    default: ''
  },

  points: {
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
  callCompleted: {
    type: Boolean,
    default: false
  },
  callCompletedAt: {
    type: Date,
    default: null
  },
  callCompletedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  callHistory: [{
    status: {
      type: String,
      enum: ['completed', 'not_connected', 'rescheduled'],
      required: true
    },
    completedAt: {
      type: Date,
      required: true
    },
    completedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    notes: {
      type: String,
      default: ''
    }
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  
  // Store all additional/dynamic fields from uploaded files
  additionalFields: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
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
leadSchema.index({ callCompleted: 1 });
leadSchema.index({ callCompletedAt: -1 });
leadSchema.index({ callCompletedBy: 1 });

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