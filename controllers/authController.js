const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const User = require('../models/User');
const Session = require('../models/Session');
const Lead = require('../models/Lead');
const Customer = require('../models/Customer');
const Chat = require('../models/Chat');

// Generate JWT Token
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
const register = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, password, role } = req.body;

    // Check if user already exists using the new static method
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    // Validate role if provided
    if (role && !['user', 'admin'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role. Must be "user" or "admin"' });
    }

    // Create new user
    const user = new User({
      name,
      email,
      password,
      role: role || 'user' // Default to 'user' if no role provided
    });

    await user.save();

    // Generate token
    const token = generateToken(user._id);



    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error('❌ Register error:', error);
    res.status(500).json({ message: 'Server error during registration' });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    // Check if user exists using the new static method
    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(400).json({ message: 'Email not found. Please check your email address or create a new account.' });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(400).json({ message: 'Account is deactivated. Please contact support for assistance.' });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Incorrect password. Please try again.' });
    }

    // Update last login
    await user.updateLastLogin();

    // Update first login time of the day
    await user.updateFirstLoginTime();

    // End any existing active sessions for this user
    await Session.updateMany(
      { userId: user._id, isActive: true },
      { 
        logoutTime: new Date(),
        isActive: false 
      }
    );

    // Create new session
    const session = new Session({
      userId: user._id,
      loginTime: new Date(),
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip || req.connection.remoteAddress
    });
    await session.save();



    // Generate token
    const token = generateToken(user._id);



    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        lastLogin: user.lastLogin,
        firstLoginTime: user.firstLoginTime
      }
    });
  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
};

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
const getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        lastLogin: user.lastLogin,
        firstLoginTime: user.firstLoginTime,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error('❌ Get current user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get all users (admin only)
// @route   GET /api/auth/users
// @access  Private/Admin
const getAllUsers = async (req, res) => {
  try {
    const users = await User.find({}).select('-password').sort({ createdAt: -1 });
    
    res.json({
      count: users.length,
      users
    });
  } catch (error) {
    console.error('❌ Get all users error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Update user role (admin only)
// @route   PUT /api/auth/users/:id/role
// @access  Private/Admin
const updateUserRole = async (req, res) => {
  try {
    const { role } = req.body;
    
    if (!['user', 'admin'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role. Must be "user" or "admin"' });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      success: true,
      message: 'User role updated successfully',
      user
    });
  } catch (error) {
    console.error('❌ Update user role error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get system statistics (admin only)
// @route   GET /api/auth/stats
// @access  Private/Admin
const getSystemStats = async (req, res) => {
  try {
    // Import models if not already imported
    const Lead = require('../models/Lead');
    const Customer = require('../models/Customer');
    const Chat = require('../models/Chat');

    const totalUsers = await User.countDocuments({});
    const totalLeads = await Lead.countDocuments({ isActive: true });
    const totalCustomers = await Customer.countDocuments({});
    const totalChats = await Chat.countDocuments({ isActive: true });

    // Get user activity stats (users who logged in within last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const activeUsers = await User.countDocuments({ 
      lastLogin: { $gte: sevenDaysAgo }
    });

    console.log('📊 System stats calculated:', {
      totalUsers,
      totalLeads,
      totalCustomers,
      totalChats,
      activeUsers
    });

    res.json({
      success: true,
      stats: {
        totalUsers,
        totalLeads,
        totalCustomers,
        totalChats,
        activeUsers
      }
    });
  } catch (error) {
    console.error('❌ Get system stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Check if this is the first user
// @route   GET /api/auth/check-first-user
// @access  Public
const checkFirstUser = async (req, res) => {
  try {
    const userCount = await User.countDocuments({});
    const isFirstUser = userCount === 0;

    res.json({
      success: true,
      isFirstUser
    });
  } catch (error) {
    console.error('❌ Check first user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Delete user (admin only)
// @route   DELETE /api/auth/users/:id
// @access  Private/Admin
const deleteUser = async (req, res) => {
  try {
    const userId = req.params.id;
    
    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Prevent admin from deleting themselves
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: 'You cannot delete your own account' });
    }
    
    // Delete all sessions associated with this user
    const deletedSessions = await Session.deleteMany({ userId: userId });
    
    // Delete all leads created by this user
    const Lead = require('../models/Lead');
    const deletedLeads = await Lead.deleteMany({ createdBy: userId });
    
    // Update leads assigned to this user (set assignedTo to null)
    const updatedLeads = await Lead.updateMany(
      { assignedTo: userId },
      { $set: { assignedTo: null } }
    );
    
    // Delete all call schedules created by this user
    const CallSchedule = require('../models/CallSchedule');
    const deletedCallSchedules = await CallSchedule.deleteMany({ scheduledBy: userId });
    
    // Delete all chats associated with this user
    const Chat = require('../models/Chat');
    const deletedChats = await Chat.deleteMany({ userId: userId });
    
    // Delete all customers created by this user
    const Customer = require('../models/Customer');
    const deletedCustomers = await Customer.deleteMany({ userId: userId });
    
    // Finally, delete the user
    await User.findByIdAndDelete(userId);
    
    res.json({
      success: true,
      message: 'User and all associated data permanently deleted'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ message: 'Server error during user deletion' });
  }
};

module.exports = {
  register,
  login,
  getCurrentUser,
  getAllUsers,
  updateUserRole,
  getSystemStats,
  checkFirstUser,
  deleteUser
};