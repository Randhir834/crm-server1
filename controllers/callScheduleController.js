const CallSchedule = require('../models/CallSchedule');
const Lead = require('../models/Lead');
const mongoose = require('mongoose');

// Create a new call schedule
const createCallSchedule = async (req, res) => {
  try {
    const { leadId, scheduledDate, scheduledTime, duration, notes } = req.body;
    const userId = req.user.id;
    
        console.log('Creating call schedule:', { leadId, scheduledDate, scheduledTime, duration, notes, userId });
    
    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(leadId)) {
      console.log('Invalid ObjectId format:', leadId);
      return res.status(400).json({ message: 'Invalid lead ID format' });
    }
    
    // Validate that the lead exists and belongs to the user
    let lead = await Lead.findOne({ _id: leadId, createdBy: userId, isActive: true });
    console.log('Lead found with createdBy:', lead ? 'Yes' : 'No');
    
    // If not found with createdBy, try to find the lead without createdBy check
    if (!lead) {
      lead = await Lead.findOne({ _id: leadId, isActive: true });
      console.log('Lead found without createdBy:', lead ? 'Yes' : 'No');
      if (!lead) {
        console.log('Lead not found at all');
        return res.status(404).json({ message: 'Lead not found' });
      }
      // Update the lead with the current user as createdBy if not set
      if (!lead.createdBy) {
        lead.createdBy = userId;
        await lead.save();
        console.log('Updated lead with createdBy');
      }
    }

    // Check if there's already a scheduled call for this lead at the same time
    const existingCall = await CallSchedule.findOne({
      leadId,
      scheduledDate: new Date(scheduledDate),
      scheduledTime,
      status: 'Scheduled',
      isActive: true
    });

    if (existingCall) {
      return res.status(400).json({ message: 'A call is already scheduled for this lead at this time' });
    }

    const callSchedule = new CallSchedule({
      leadId,
      scheduledBy: userId,
      scheduledDate: new Date(scheduledDate),
      scheduledTime,
      duration: duration || 30,
      notes: notes || ''
    });

    await callSchedule.save();

    // Populate lead details for response
    await callSchedule.populate('leadId', 'name email phone company status');

    res.status(201).json({
      message: 'Call scheduled successfully',
      callSchedule
    });
  } catch (error) {
    console.error('Error creating call schedule:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Get all call schedules for a user
const getCallSchedules = async (req, res) => {
  try {
    const userId = req.user._id;
    const { status, date } = req.query;

    let query = { scheduledBy: userId };

    // Filter by status if provided
    if (status) {
      query.status = status;
    }

    // Filter by date if provided
    if (date) {
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);
      query.scheduledDate = { $gte: startDate, $lte: endDate };
    }

    const callSchedules = await CallSchedule.find(query)
      .populate('leadId', 'name email phone company status')
      .sort({ scheduledDate: 1, scheduledTime: 1 });

    console.log('Returning call schedules:', {
      count: callSchedules.length,
      schedules: callSchedules.map(s => ({ id: s._id, isActive: s.isActive, status: s.status }))
    });

    res.json({
      success: true,
      callSchedules,
      total: callSchedules.length
    });
  } catch (error) {
    console.error('Error fetching call schedules:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Get upcoming calls
const getUpcomingCalls = async (req, res) => {
  try {
    const userId = req.user._id;
    const { limit = 10 } = req.query;

    const upcomingCalls = await CallSchedule.findUpcoming(userId)
      .limit(parseInt(limit))
      .sort({ scheduledDate: 1, scheduledTime: 1 });

    res.json({
      success: true,
      callSchedules: upcomingCalls,
      total: upcomingCalls.length
    });
  } catch (error) {
    console.error('Error fetching upcoming calls:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Get call schedule by ID
const getCallSchedule = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const callSchedule = await CallSchedule.findOne({
      _id: id,
      scheduledBy: userId
    }).populate('leadId', 'name email phone company status');

    if (!callSchedule) {
      return res.status(404).json({ message: 'Call schedule not found' });
    }

    res.json({ 
      success: true,
      callSchedule 
    });
  } catch (error) {
    console.error('Error fetching call schedule:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Update call schedule
const updateCallSchedule = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { scheduledDate, scheduledTime, duration, notes, status } = req.body;

    const callSchedule = await CallSchedule.findOne({
      _id: id,
      scheduledBy: userId
    });

    if (!callSchedule) {
      return res.status(404).json({ message: 'Call schedule not found' });
    }

    // Update fields if provided
    if (scheduledDate) callSchedule.scheduledDate = new Date(scheduledDate);
    if (scheduledTime) callSchedule.scheduledTime = scheduledTime;
    if (duration) callSchedule.duration = duration;
    if (notes !== undefined) callSchedule.notes = notes;
    if (status) callSchedule.status = status;

    await callSchedule.save();
    await callSchedule.populate('leadId', 'name email phone company status');

    res.json({
      message: 'Call schedule updated successfully',
      callSchedule
    });
  } catch (error) {
    console.error('Error updating call schedule:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Delete call schedule
const deleteCallSchedule = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    console.log('Deleting call schedule:', { id, userId });

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      console.log('Invalid ObjectId format:', id);
      return res.status(400).json({ message: 'Invalid call schedule ID format' });
    }

    const callSchedule = await CallSchedule.findOne({
      _id: id,
      scheduledBy: userId
    });

    if (!callSchedule) {
      console.log('Call schedule not found');
      return res.status(404).json({ message: 'Call schedule not found' });
    }

    console.log('Found call schedule to delete:', callSchedule._id);
    console.log('Performing hard delete - removing from database');
    
    // Perform hard delete - completely remove from database
    await CallSchedule.findByIdAndDelete(callSchedule._id);
    console.log('Call schedule hard deleted successfully from database');

    res.json({ message: 'Call schedule deleted successfully' });
  } catch (error) {
    console.error('Error deleting call schedule:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Get call schedule statistics
const getCallStats = async (req, res) => {
  try {
    const userId = req.user._id;

    const stats = await CallSchedule.aggregate([
      { $match: { scheduledBy: userId } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);
    
    // Format stats
    const formattedStats = {
      total: 0,
      scheduled: 0,
      completed: 0,
      cancelled: 0,
      noShow: 0
    };

    // Calculate total
    const totalCalls = await CallSchedule.countDocuments({ scheduledBy: userId });
    formattedStats.total = totalCalls;

    stats.forEach(stat => {
      const statusKey = stat._id.toLowerCase().replace(' ', '');
      if (formattedStats.hasOwnProperty(statusKey)) {
        formattedStats[statusKey] = stat.count;
      }
    });

    console.log('Call stats for user:', userId, formattedStats);

    res.json({ 
      success: true,
      stats: formattedStats 
    });
  } catch (error) {
    console.error('Error fetching call stats:', error);
    res.status(500).json({ 
      success: false,
      message: 'Internal server error' 
    });
  }
};

module.exports = {
  createCallSchedule,
  getCallSchedules,
  getUpcomingCalls,
  getCallSchedule,
  updateCallSchedule,
  deleteCallSchedule,
  getCallStats
}; 