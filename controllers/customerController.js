const { validationResult } = require('express-validator');
const Customer = require('../models/Customer');
const Lead = require('../models/Lead');

// @desc    Get all customers for a user
// @route   GET /api/customers
// @access  Private
const getCustomers = async (req, res) => {
  try {
    // Build query based on user role
    let query = {};
    
    // If user is not admin, only show their own customers
    if (req.user.role !== 'admin') {
      query.userId = req.user._id;
    }

    const customers = await Customer.find(query)
      .populate('userId', 'name')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: customers.length,
      customers
    });
  } catch (error) {
    console.error('❌ Get customers error:', error);
    res.status(500).json({ message: 'Server error while fetching customers' });
  }
};

// @desc    Get customer by ID
// @route   GET /api/customers/:id
// @access  Private
const getCustomerById = async (req, res) => {
  try {
    const customer = await Customer.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    res.json({
      success: true,
      customer
    });
  } catch (error) {
    console.error('❌ Get customer by ID error:', error);
    res.status(500).json({ message: 'Server error while fetching customer' });
  }
};

// @desc    Create new customer
// @route   POST /api/customers
// @access  Private
const createCustomer = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, phone, status, notes } = req.body;



    const customer = new Customer({
          name,
    phone,
    status,
    notes,
      userId: req.user._id
    });

    await customer.save();



    res.status(201).json({
      success: true,
      message: 'Customer created successfully',
      customer
    });
  } catch (error) {
    console.error('❌ Create customer error:', error);
    res.status(500).json({ message: 'Server error while creating customer' });
  }
};

// @desc    Update customer
// @route   PUT /api/customers/:id
// @access  Private
const updateCustomer = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, phone, status, notes } = req.body;

    const customer = await Customer.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }



    // Update fields
    if (name) customer.name = name;

    if (phone !== undefined) customer.phone = phone;

    if (status) customer.status = status;
    if (notes !== undefined) customer.notes = notes;

    await customer.save();



    res.json({
      success: true,
      message: 'Customer updated successfully',
      customer
    });
  } catch (error) {
    console.error('❌ Update customer error:', error);
    res.status(500).json({ message: 'Server error while updating customer' });
  }
};

// @desc    Delete customer
// @route   DELETE /api/customers/:id
// @access  Private
const deleteCustomer = async (req, res) => {
  try {
    const customer = await Customer.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    await customer.deleteOne();



    res.json({
      success: true,
      message: 'Customer deleted successfully'
    });
  } catch (error) {
    console.error('❌ Delete customer error:', error);
    res.status(500).json({ message: 'Server error while deleting customer' });
  }
};

// @desc    Convert lead to customer
// @route   POST /api/customers/convert-lead/:leadId
// @access  Private
const convertLeadToCustomer = async (req, res) => {
  try {
    const { leadId } = req.params;

    // Find the lead
    const lead = await Lead.findOne({
      _id: leadId,
      userId: req.user._id
    });

    if (!lead) {
      return res.status(404).json({ message: 'Lead not found' });
    }

    // Check if lead is already converted
    const existingCustomer = await Customer.findByLeadId(leadId);
    if (existingCustomer) {
      return res.status(400).json({ message: 'Lead has already been converted to customer' });
    }



    // Create new customer from lead
    const customer = new Customer({
          name: lead.name,
    
    phone: lead.phone,
    status: 'active',
      notes: `Converted from lead: ${lead.notes || 'No notes'}`,
      convertedFrom: {
        leadId: lead._id,
        convertedAt: new Date()
      },
      userId: req.user._id
    });

    await customer.save();

    // Update lead status to 'Converted'
    lead.status = 'Converted';
    await lead.save();



    res.status(201).json({
      success: true,
      message: 'Lead successfully converted to customer',
      customer
    });
  } catch (error) {
    console.error('❌ Convert lead to customer error:', error);
    res.status(500).json({ message: 'Server error while converting lead to customer' });
  }
};

// @desc    Get customer statistics
// @route   GET /api/customers/stats
// @access  Private
const getCustomerStats = async (req, res) => {
  try {
    const stats = await Customer.aggregate([
      { $match: { userId: req.user._id } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          active: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
          inactive: { $sum: { $cond: [{ $eq: ['$status', 'inactive'] }, 1, 0] } },
          pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } }
        }
      }
    ]);

    const result = stats[0] || { total: 0, active: 0, inactive: 0, pending: 0 };

    res.json({
      success: true,
      stats: result
    });
  } catch (error) {
    console.error('❌ Get customer stats error:', error);
    res.status(500).json({ message: 'Server error while fetching customer statistics' });
  }
};

module.exports = {
  getCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  convertLeadToCustomer,
  getCustomerStats
}; 