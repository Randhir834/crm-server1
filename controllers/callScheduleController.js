const CallSchedule = require('../models/CallSchedule');
const Lead = require('../models/Lead');
const User = require('../models/User');
const mongoose = require('mongoose');

// Create a new call schedule
const createCallSchedule = async (req, res) => {
  try {
    const { leadId, scheduledDate, scheduledTime, duration } = req.body;
    const userId = req.user._id;
    
        console.log('Creating call schedule:', { leadId, scheduledDate, scheduledTime, duration, userId });
    
    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(leadId)) {
      console.log('Invalid ObjectId format:', leadId);
      return res.status(400).json({ message: 'Invalid lead ID format' });
    }
    
    // Validate that the lead exists
    let lead = await Lead.findOne({ _id: leadId, isActive: true });
    console.log('Lead found:', lead ? 'Yes' : 'No');
    
    if (!lead) {
      console.log('Lead not found');
      return res.status(404).json({ message: 'Lead not found' });
    }
    
    // Update the lead with the current user as createdBy if not set
    if (!lead.createdBy) {
      lead.createdBy = userId;
      await lead.save();
      console.log('Updated lead with createdBy:', userId);
    }

    // Check if there's already a scheduled call for this lead at the same time
    const existingCall = await CallSchedule.findOne({
      leadId,
      scheduledDate: new Date(scheduledDate),
      scheduledTime,
      status: { $in: ['Scheduled', 'Completed'] }, // Check both scheduled and completed calls
      isActive: true
    });

    if (existingCall) {
      return res.status(400).json({ 
        message: 'A call is already scheduled for this lead at this time',
        existingCall: {
          id: existingCall._id,
          scheduledDate: existingCall.scheduledDate,
          scheduledTime: existingCall.scheduledTime,
          status: existingCall.status
        }
      });
    }

    const callSchedule = new CallSchedule({
      leadId,
      scheduledBy: userId,
      scheduledDate: new Date(scheduledDate),
      scheduledTime,
      duration: duration || 30
    });

    await callSchedule.save();

    // Populate lead details for response
    await callSchedule.populate({
      path: 'leadId',
      select: 'name  phone  status',
      populate: {
        path: 'createdBy',
        select: 'name '
      }
    });

    res.status(201).json({
      message: 'Call scheduled successfully',
      callSchedule
    });
  } catch (error) {
    console.error('Error creating call schedule:', error);
    
    // Handle unique constraint violation
    if (error.code === 11000) {
      return res.status(400).json({ 
        message: 'A call is already scheduled for this lead at this time',
        error: 'DUPLICATE_SCHEDULE'
      });
    }
    
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Get all call schedules for a user
const getCallSchedules = async (req, res) => {
  try {
    const userId = req.user._id;
    const { status, date } = req.query;

    // Build query based on user role
    let query = {};
    
    // If user is not admin, only show their own scheduled calls
    if (req.user.role !== 'admin') {
      query.scheduledBy = userId;
    }

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
      .populate({
        path: 'leadId',
        select: 'name  phone  status createdBy',
        populate: {
          path: 'createdBy',
          select: 'name '
        }
      })
      .populate('scheduledBy', 'name ')
      .sort({ scheduledDate: 1, scheduledTime: 1 });

    // Ensure all leads have valid createdBy data
    for (const schedule of callSchedules) {
      if (schedule.leadId && (!schedule.leadId.createdBy || !schedule.leadId.createdBy.name)) {
        // If createdBy is missing or invalid, try to find the user who scheduled the call
        const scheduledByUser = await User.findById(schedule.scheduledBy).select('name ');
        if (scheduledByUser) {
          schedule.leadId.createdBy = scheduledByUser;
        }
      }
    }

    console.log('Returning call schedules:', {
      count: callSchedules.length,
      userRole: req.user.role,
      userId: req.user._id,
      query: query,
      schedules: callSchedules.map(s => ({ 
        id: s._id, 
        leadName: s.leadId?.name,
        scheduledBy: s.scheduledBy?.name,
        status: s.status 
      }))
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

    // Build query based on user role
    let query = {};
    
    // If user is not admin, only show their own upcoming calls
    if (req.user.role !== 'admin') {
      query.scheduledBy = userId;
    }

    const upcomingCalls = await CallSchedule.find(query)
      .populate({
        path: 'leadId',
        select: 'name  phone  status',
        populate: {
          path: 'createdBy',
          select: 'name '
        }
      })
      .populate('scheduledBy', 'name ')
      .where('scheduledDate').gte(new Date())
      .where('status').equals('Scheduled')
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

    // Build query based on user role
    let query = { _id: id };
    
    // If user is not admin, only allow access to their own scheduled calls
    if (req.user.role !== 'admin') {
      query.scheduledBy = userId;
    }

    const callSchedule = await CallSchedule.findOne(query).populate({
      path: 'leadId',
      select: 'name  phone  status',
      populate: {
        path: 'createdBy',
        select: 'name '
      }
    });

    if (!callSchedule) {
      return res.status(404).json({ message: 'Call schedule not found or you are not authorized to view it' });
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
    const userId = req.user._id;
    const { scheduledDate, scheduledTime, duration, status } = req.body;

    // Build query based on user role
    let query = { _id: id };
    
    // If user is not admin, only allow updates to their own scheduled calls
    if (req.user.role !== 'admin') {
      query.scheduledBy = userId;
    }

    const callSchedule = await CallSchedule.findOne(query);

    if (!callSchedule) {
      return res.status(404).json({ message: 'Call schedule not found or you are not authorized to update it' });
    }

    // Update fields if provided
    if (scheduledDate) callSchedule.scheduledDate = new Date(scheduledDate);
    if (scheduledTime) callSchedule.scheduledTime = scheduledTime;
    if (duration) callSchedule.duration = duration;
    if (status) callSchedule.status = status;

    await callSchedule.save();
    await callSchedule.populate({
      path: 'leadId',
      select: 'name  phone  status',
      populate: {
        path: 'createdBy',
        select: 'name '
      }
    });

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
    const userId = req.user._id;
    
    console.log('Deleting call schedule:', { id, userId, userRole: req.user.role });

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      console.log('Invalid ObjectId format:', id);
      return res.status(400).json({ message: 'Invalid call schedule ID format' });
    }

    // Build query based on user role
    let query = { _id: id };
    
    // If user is not admin, only allow deletion of their own scheduled calls
    if (req.user.role !== 'admin') {
      query.scheduledBy = userId;
    }

    const callSchedule = await CallSchedule.findOne(query);

    if (!callSchedule) {
      console.log('Call schedule not found or user not authorized');
      return res.status(404).json({ message: 'Call schedule not found or you are not authorized to delete it' });
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

    // Build match condition based on user role
    let matchCondition = {};
    
    // If user is not admin, only show their own stats
    if (req.user.role !== 'admin') {
      matchCondition.scheduledBy = userId;
    }

    const stats = await CallSchedule.aggregate([
      { $match: matchCondition },
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
    const totalCalls = await CallSchedule.countDocuments(matchCondition);
    formattedStats.total = totalCalls;

    stats.forEach(stat => {
      const statusKey = stat._id.toLowerCase().replace(' ', '');
      if (formattedStats.hasOwnProperty(statusKey)) {
        formattedStats[statusKey] = stat.count;
      }
    });

    console.log('Call stats for user:', userId, 'role:', req.user.role, formattedStats);

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