const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');
const Session = require('../models/Session');
const {
  createSession,
  endSession,
  getSessionStats,
  getCurrentSession,
  getSessionUpdates,
  getAllUserSessions
} = require('../controllers/sessionController');

// Create new session (called on login)
router.post('/create', auth, createSession);

// End current session (called on logout)
router.post('/end', auth, endSession);

// Get session statistics for current user
router.get('/stats', auth, getSessionStats);

// Get current session info
router.get('/current', auth, getCurrentSession);

// Get real-time session updates (for polling)
router.get('/updates', auth, getSessionUpdates);

// Get all user sessions (admin only)
router.get('/all', auth, admin, getAllUserSessions);



module.exports = router;