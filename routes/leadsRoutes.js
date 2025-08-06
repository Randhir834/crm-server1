const express = require('express');
const router = express.Router();
const multer = require('multer');
const { body } = require('express-validator');
const auth = require('../middleware/auth');
const {
  uploadLeads,
  getLeads,
  getLeadStats,
  getLead,
  updateLead,
  updateLeadStatus,
  deleteLead,
  softDeleteLead,
  exportLeads
} = require('../controllers/leadsController');

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept all file types and let the processing logic handle validation
    const allowedExtensions = ['.csv', '.xlsx', '.xls'];
    const fileExtension = file.originalname.toLowerCase().substring(file.originalname.lastIndexOf('.'));
    
    if (allowedExtensions.includes(fileExtension)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type. Only ${allowedExtensions.join(', ')} files are allowed.`), false);
    }
  }
});

// Validation rules
const leadValidation = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('phone')
    .optional()
    .trim()
    .isLength({ max: 20 })
    .withMessage('Phone number is too long'),
  body('company')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Company name is too long'),
  // **MODIFIED**: Synchronized status enum with the Lead schema
  body('status')
    .optional()
    .isIn(['New', 'Qualified', 'Negotiation', 'Closed', 'Lost'])
    .withMessage('Invalid status'),
  body('source')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Source is too long'),
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Notes are too long')
];

// Routes
// Upload leads from file
router.post('/upload', auth, upload.single('file'), uploadLeads);

// Get all leads with pagination and filtering
router.get('/', auth, getLeads);

// Get lead statistics
router.get('/stats', auth, getLeadStats);

// Get single lead
router.get('/:id', auth, getLead);

// Update lead
router.put('/:id', auth, leadValidation, updateLead);

// Update lead status
router.patch('/:id/status', auth, updateLeadStatus);

// Delete lead (hard delete - completely remove from database)
router.delete('/:id', auth, deleteLead);

// Soft delete lead (mark as inactive)
router.patch('/:id/deactivate', auth, softDeleteLead);

// Export leads to Excel
router.get('/export/excel', auth, exportLeads);

module.exports = router;