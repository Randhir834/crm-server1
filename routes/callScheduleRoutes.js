const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const {
  createCallSchedule,
  getCallSchedules,
  getUpcomingCalls,
  getCallSchedule,
  updateCallSchedule,
  deleteCallSchedule,
  getCallStats
} = require('../controllers/callScheduleController');

// Validation middleware
const { body } = require('express-validator');

const callScheduleValidation = [
  body('leadId').isMongoId().withMessage('Valid lead ID is required'),
  body('scheduledDate').isISO8601().withMessage('Valid date is required'),
  body('scheduledTime').isString().notEmpty().withMessage('Time is required'),
  body('duration').optional().isInt({ min: 15, max: 480 }).withMessage('Duration must be between 15 and 480 minutes'),
  body('notes').optional().isString().trim()
];

// Routes
router.post('/', auth, callScheduleValidation, createCallSchedule);
router.get('/', auth, getCallSchedules);
router.get('/upcoming', auth, getUpcomingCalls);
router.get('/stats', auth, getCallStats);
router.get('/:id', auth, getCallSchedule);
router.put('/:id', auth, callScheduleValidation, updateCallSchedule);
router.delete('/:id', auth, deleteCallSchedule);

module.exports = router; 