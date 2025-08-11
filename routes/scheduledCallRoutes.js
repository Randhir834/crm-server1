const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const {
  createScheduledCall,
  getScheduledCallsByLead,
  updateScheduledCall,
  deleteScheduledCall,
  getPendingScheduledCalls,
  getCompletedScheduledCalls
} = require('../controllers/scheduledCallController');

// All routes require authentication
router.use(auth);

// Create a new scheduled call
router.post('/', createScheduledCall);

// Get all scheduled calls for a specific lead
router.get('/lead/:leadId', getScheduledCallsByLead);

// Get all pending scheduled calls
router.get('/pending', getPendingScheduledCalls);

// Get all completed scheduled calls
router.get('/completed', getCompletedScheduledCalls);

// Update a scheduled call
router.put('/:id', updateScheduledCall);

// Delete a scheduled call
router.delete('/:id', deleteScheduledCall);

module.exports = router; 