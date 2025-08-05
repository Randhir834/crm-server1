const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    minlength: [2, 'Name must be at least 2 characters long'],
    maxlength: [50, 'Name cannot exceed 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  phone: {
    type: String,
    trim: true,
    default: null
  },
  company: {
    type: String,
    trim: true,
    default: null
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'pending'],
    default: 'active'
  },
  notes: {
    type: String,
    trim: true,
    default: null
  },
  convertedFrom: {
    leadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lead',
      required: true
    },
    convertedAt: {
      type: Date,
      default: Date.now
    }
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true,
  collection: 'customers'
});

// Create indexes for better performance
customerSchema.index({ userId: 1, createdAt: -1 });
customerSchema.index({ email: 1 });
customerSchema.index({ status: 1 });
customerSchema.index({ convertedFrom: 1 });

// Static method to find customer by email
customerSchema.statics.findByEmail = function(email) {
  return this.findOne({ email });
};

// Static method to find customer by lead ID
customerSchema.statics.findByLeadId = function(leadId) {
  return this.findOne({ 'convertedFrom.leadId': leadId });
};

// Method to get customer without sensitive data
customerSchema.methods.toJSON = function() {
  const customer = this.toObject();
  return customer;
};

module.exports = mongoose.model('Customer', customerSchema); 