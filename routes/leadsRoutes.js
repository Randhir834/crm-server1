const express = require("express");
const router = express.Router();
const multer = require("multer");
const { body } = require("express-validator");
const auth = require("../middleware/auth");
const admin = require("../middleware/admin");
const {
  uploadLeads,
  getLeads,
  getLeadStats,

  getLead,
  updateLead,
  updateLeadStatus,
  deleteLead,
  softDeleteLead,
  exportLeads,
} = require("../controllers/leadsController");

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept all file types and let the processing logic handle validation
    const allowedExtensions = [".csv", ".xlsx", ".xls"];
    const fileExtension = file.originalname
      .toLowerCase()
      .substring(file.originalname.lastIndexOf("."));

    if (allowedExtensions.includes(fileExtension)) {
      cb(null, true);
    } else {
      cb(
        new Error(
          `Invalid file type. Only ${allowedExtensions.join(
            ", "
          )} files are allowed.`
        ),
        false
      );
    }
  },
});

// Validation rules
const leadValidation = [
  body("name")
    .exists({ checkFalsy: true })
    .withMessage("Name is required")
    .isString()
    .withMessage("Name must be a string")
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage("Name must be between 2 and 100 characters"),

  body("phone")
    .optional({ nullable: true })
    .isString()
    .withMessage("Phone must be a string")
    .trim()
    .isLength({ max: 20 })
    .withMessage("Phone number is too long"),

  body("service")
    .optional({ nullable: true })
    .isString()
    .withMessage("Service must be a string")
    .trim()
    .isLength({ max: 100 })
    .withMessage("Service description is too long"),

  body("status")
    .optional({ nullable: true })
    .isIn(["New", "Qualified", "Negotiation", "Closed", "Lost"])
    .withMessage("Invalid status"),

  body("notes")
    .optional({ nullable: true })
    .isString()
    .withMessage("Notes must be a string")
    .trim()
    .isLength({ max: 1000 })
    .withMessage("Notes are too long"),
];

// Routes
// Upload leads from file - Admin only
router.post("/upload", auth, admin, upload.single("file"), uploadLeads);

// Get all leads with pagination and filtering
router.get("/", auth, getLeads);

// Get lead statistics
router.get("/stats", auth, getLeadStats);

// Get single lead
router.get("/:id", auth, getLead);

// Update lead
router.put("/:id", auth, leadValidation, updateLead);

// Update lead status
router.patch("/:id/status", auth, updateLeadStatus);

// Delete lead (hard delete - completely remove from database) - Admin only
router.delete("/:id", auth, admin, deleteLead);

// Soft delete lead (mark as inactive)
router.patch("/:id/deactivate", auth, softDeleteLead);

// Export leads to Excel - Admin only
router.get("/export/excel", auth, admin, exportLeads);

module.exports = router;
