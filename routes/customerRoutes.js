const express = require('express');
const { body, validationResult } = require('express-validator');
const customerController = require('../controllers/customerController');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');

const router = express.Router();

// Apply auth middleware to all routes
router.use(auth);

// @route   GET /api/customers
// @desc    Get all customers
// @access  Private
router.get('/', customerController.getCustomers);

// @route   GET /api/customers/stats
// @desc    Get customer statistics
// @access  Private
router.get('/stats', customerController.getCustomerStats);

// @route   GET /api/customers/:id
// @desc    Get customer by ID
// @access  Private
router.get('/:id', customerController.getCustomerById);

// @route   POST /api/customers
// @desc    Create new customer
// @access  Private
router.post('/', [
  body('name').trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters long'),

  body('phone').optional().trim(),
  body('status').optional().isIn(['active', 'inactive', 'pending']).withMessage('Invalid status'),
  body('notes').optional().trim()
], customerController.createCustomer);

// @route   PUT /api/customers/:id
// @desc    Update customer
// @access  Private
router.put('/:id', [
  body('name').optional().trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters long'),

  body('phone').optional().trim(),
  body('status').optional().isIn(['active', 'inactive', 'pending']).withMessage('Invalid status'),
  body('notes').optional().trim()
], customerController.updateCustomer);

// @route   DELETE /api/customers/:id
// @desc    Delete customer
// @access  Admin only
router.delete('/:id', auth, admin, customerController.deleteCustomer);

// @route   POST /api/customers/convert-lead/:leadId
// @desc    Convert lead to customer
// @access  Private
router.post('/convert-lead/:leadId', customerController.convertLeadToCustomer);

module.exports = router; 