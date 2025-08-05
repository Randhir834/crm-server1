const mongoose = require('mongoose');
const Session = require('../models/Session');
const User = require('../models/User');

// Create a new session when user logs in
const createSession = async (req, res) => {
  try {
    const userId = req.user.id; // Get userId from authenticated user
    
    // End any existing active session for this user
    await Session.updateMany(
      { userId: mongoose.Types.ObjectId(userId), isActive: true },
      { 
        logoutTime: new Date(),
        isActive: false 
      }
    );

    // Create new session
    const session = new Session({
      userId: mongoose.Types.ObjectId(userId),
      loginTime: new Date(),
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip || req.connection.remoteAddress
    });

    await session.save();

    // Update user's lastLogin
    await User.findByIdAndUpdate(mongoose.Types.ObjectId(userId), { lastLogin: new Date() });

    res.status(201).json({
      success: true,
      session: {
        id: session._id,
        loginTime: session.loginTime
      }
    });
  } catch (error) {
    console.error('Error creating session:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create session'
    });
  }
};

// End current session when user logs out
const endSession = async (req, res) => {
  try {
    const userId = req.user.id; // Get userId from authenticated user
    console.log('Ending session for user:', userId);
    
    const session = await Session.getCurrentSession(userId);
    console.log('Found session to end:', session);
    
    if (!session) {
      console.log('No active session found for user:', userId);
      return res.status(404).json({
        success: false,
        message: 'No active session found'
      });
    }

    console.log('Ending session with ID:', session._id);
    await session.endSession();
    console.log('Session ended successfully. Logout time:', session.logoutTime);
    console.log('Session duration:', session.duration);



    res.json({
      success: true,
      session: {
        id: session._id,
        loginTime: session.loginTime,
        logoutTime: session.logoutTime,
        duration: session.duration
      }
    });
  } catch (error) {
    console.error('Error ending session:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to end session'
    });
  }
};

// Get user's session statistics
const getSessionStats = async (req, res) => {
  try {
    const userId = req.user.id; // Get userId from authenticated user
    console.log('Getting session stats for user:', userId);
    
    // Get current active session
    let currentSession = await Session.getCurrentSession(userId);
    console.log('Current session:', currentSession);
    
    // If no current session exists, that's fine - user might not have logged in yet
    if (!currentSession) {
      console.log('No current session found for user:', userId);
    }
    
    // Get recent sessions (last 10)
    const recentSessions = await Session.getUserSessions(userId, 10);
    
    // Get total session time from completed sessions in the last 24 hours
    const totalTimeResult = await Session.getTotalSessionTime(userId);
    const totalSessionTime = totalTimeResult[0]?.totalDuration || 0;
    
    // Get sessions from the last 24 hours
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const last24HoursSessions = await Session.find({
      userId: mongoose.Types.ObjectId(userId),
      loginTime: { $gte: twentyFourHoursAgo }
    });
    
    // Calculate total time spent in the last 24 hours
    let last24HoursTime = 0;
    last24HoursSessions.forEach(session => {
      if (session.logoutTime && session.duration) {
        last24HoursTime += session.duration;
      } else if (session.isActive) {
        // For active sessions, calculate duration up to now
        const currentDuration = Date.now() - session.loginTime.getTime();
        last24HoursTime += currentDuration;
      }
    });
    
    // Calculate current session duration if active
    let currentSessionDuration = 0;
    if (currentSession) {
      currentSessionDuration = Date.now() - currentSession.loginTime.getTime();
    }
    
    // Total usage includes completed sessions + current session
    const totalUsage = totalSessionTime + currentSessionDuration;
    
    // Last 24 hours usage
    const last24HoursUsage = last24HoursTime + (currentSession ? currentSessionDuration : 0);
    
    // Get user info for other stats
    const user = await User.findById(mongoose.Types.ObjectId(userId));
    
    const response = {
      success: true,
      stats: {
        currentSession: currentSession ? {
          id: currentSession._id,
          loginTime: currentSession.loginTime,
          duration: currentSessionDuration
        } : null,
        recentSessions: recentSessions.map(session => ({
          id: session._id,
          loginTime: session.loginTime,
          logoutTime: session.logoutTime,
          duration: session.duration,
          isActive: session.isActive
        })),
        totalSessionTime: totalUsage, // Use total usage instead of just completed sessions
        last24HoursUsage: last24HoursUsage, // Time spent in last 24 hours
        totalSessions: recentSessions.length
      }
    };

    res.json(response);
  } catch (error) {
    console.error('Error getting session stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get session statistics'
    });
  }
};

// Get current session info
const getCurrentSession = async (req, res) => {
  try {
    const userId = req.user.id; // Get userId from authenticated user
    
    const session = await Session.getCurrentSession(userId);
    
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'No active session found'
      });
    }

    const currentDuration = Date.now() - session.loginTime.getTime();

    res.json({
      success: true,
      session: {
        id: session._id,
        loginTime: session.loginTime,
        duration: currentDuration
      }
    });
  } catch (error) {
    console.error('Error getting current session:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get current session'
    });
  }
};

// Get real-time session updates (for polling)
const getSessionUpdates = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get current session and user info
    const currentSession = await Session.getCurrentSession(userId);
    const user = await User.findById(mongoose.Types.ObjectId(userId));
    
    // Get user info for other stats
    
    // Calculate current session duration if active
    let currentSessionDuration = 0;
    if (currentSession) {
      currentSessionDuration = Date.now() - currentSession.loginTime.getTime();
    }
    
    // Get sessions from the last 24 hours
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const last24HoursSessions = await Session.find({
      userId: mongoose.Types.ObjectId(userId),
      loginTime: { $gte: twentyFourHoursAgo }
    });
    
    // Calculate total time spent in the last 24 hours
    let last24HoursTime = 0;
    last24HoursSessions.forEach(session => {
      if (session.logoutTime && session.duration) {
        last24HoursTime += session.duration;
      } else if (session.isActive) {
        // For active sessions, calculate duration up to now
        const currentDuration = Date.now() - session.loginTime.getTime();
        last24HoursTime += currentDuration;
      }
    });
    
    // Last 24 hours usage
    const last24HoursUsage = last24HoursTime + (currentSession ? currentSessionDuration : 0);
    
    res.json({
      success: true,
      updates: {
        currentSession: currentSession ? {
          id: currentSession._id,
          loginTime: currentSession.loginTime,
          duration: currentSessionDuration
        } : null,
        last24HoursUsage,
        lastUpdated: new Date()
      }
    });
  } catch (error) {
    console.error('Error getting session updates:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get session updates'
    });
  }
};

module.exports = {
  createSession,
  endSession,
  getSessionStats,
  getCurrentSession,
  getSessionUpdates
}; 