const ScheduledCall = require('../models/ScheduledCall');
const Lead = require('../models/Lead');

// Create a new scheduled call
const createScheduledCall = async (req, res) => {
  try {
    const { leadId, scheduledTime, notes } = req.body;
    const userId = req.user.id;

    // Validate required fields
    if (!leadId || !scheduledTime) {
      return res.status(400).json({
        success: false,
        message: 'Lead ID and scheduled time are required'
      });
    }

    // Check if lead exists
    const lead = await Lead.findById(leadId);
    if (!lead) {
      return res.status(404).json({
        success: false,
        message: 'Lead not found'
      });
    }

    // Create scheduled call
    const scheduledCall = new ScheduledCall({
      leadId,
      scheduledTime: new Date(scheduledTime + 'Z'), // Add Z to ensure UTC parsing
      notes: notes || '',
      createdBy: userId
    });

    await scheduledCall.save();

    res.status(201).json({
      success: true,
      message: 'Scheduled call created successfully',
      scheduledCall
    });
  } catch (error) {
    console.error('Error creating scheduled call:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get all scheduled calls for a lead
const getScheduledCallsByLead = async (req, res) => {
  try {
    const { leadId } = req.params;
    const userId = req.user.id;

    // Check if lead exists
    const lead = await Lead.findById(leadId);
    if (!lead) {
      return res.status(404).json({
        success: false,
        message: 'Lead not found'
      });
    }

    // Get scheduled calls for the lead
    const scheduledCalls = await ScheduledCall.findByLead(leadId);

    res.status(200).json({
      success: true,
      scheduledCalls
    });
  } catch (error) {
    console.error('Error fetching scheduled calls:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Update a scheduled call
const updateScheduledCall = async (req, res) => {
  try {
    const { id } = req.params;
    const { scheduledTime, notes, status } = req.body;
    const userId = req.user.id;

    // Find the scheduled call
    const scheduledCall = await ScheduledCall.findById(id);
    if (!scheduledCall) {
      return res.status(404).json({
        success: false,
        message: 'Scheduled call not found'
      });
    }

    // Update fields
    if (scheduledTime) {
      scheduledCall.scheduledTime = new Date(scheduledTime + 'Z'); // Add Z to ensure UTC parsing
    }
    if (notes !== undefined) {
      scheduledCall.notes = notes;
    }
    if (status) {
      scheduledCall.status = status;
    }

    await scheduledCall.save();

    res.status(200).json({
      success: true,
      message: 'Scheduled call updated successfully',
      scheduledCall
    });
  } catch (error) {
    console.error('Error updating scheduled call:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Delete a scheduled call
const deleteScheduledCall = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Find the scheduled call
    const scheduledCall = await ScheduledCall.findById(id);
    if (!scheduledCall) {
      return res.status(404).json({
        success: false,
        message: 'Scheduled call not found'
      });
    }

    // Soft delete by setting isActive to false
    scheduledCall.isActive = false;
    await scheduledCall.save();

    res.status(200).json({
      success: true,
      message: 'Scheduled call deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting scheduled call:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get all pending scheduled calls
const getPendingScheduledCalls = async (req, res) => {
  try {
    const userId = req.user.id;

    const scheduledCalls = await ScheduledCall.findPending()
      .populate('leadId', 'name phone status')
      .populate('createdBy', 'name');

    res.status(200).json({
      success: true,
      scheduledCalls
    });
  } catch (error) {
    console.error('Error fetching pending scheduled calls:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get all completed scheduled calls
const getCompletedScheduledCalls = async (req, res) => {
  try {
    const userId = req.user.id;

    const completedCalls = await ScheduledCall.find({
      status: { $in: ['completed', 'cancelled'] },
      isActive: true
    })
      .populate('leadId', 'name phone status')
      .populate('createdBy', 'name')
      .sort({ updatedAt: -1 });

    res.status(200).json({
      success: true,
      completedCalls
    });
  } catch (error) {
    console.error('Error fetching completed scheduled calls:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

module.exports = {
  createScheduledCall,
  getScheduledCallsByLead,
  updateScheduledCall,
  deleteScheduledCall,
  getPendingScheduledCalls,
  getCompletedScheduledCalls
}; 