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

// Test endpoint to manually end current session
router.post('/test-end', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    console.log('Test ending session for user:', userId);
    
    const session = await Session.getCurrentSession(userId);
    if (session) {
      await session.endSession();
      console.log('Test session ended:', session.logoutTime);
      res.json({ success: true, logoutTime: session.logoutTime });
    } else {
      res.json({ success: false, message: 'No active session' });
    }
  } catch (error) {
    console.error('Test end session error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;