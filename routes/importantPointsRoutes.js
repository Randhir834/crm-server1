const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const {
  createImportantPoint,
  getImportantPointsByLead,
  getImportantPointsByUser,
  updateImportantPoint,
  deleteImportantPoint,
  getImportantPointsSummary
} = require("../controllers/importantPointsController");

// Create a new important point
router.post("/", auth, createImportantPoint);

// Get all important points for a specific lead
router.get("/lead/:leadId", auth, getImportantPointsByLead);

// Get all important points created by the current user
router.get("/user", auth, getImportantPointsByUser);

// Get important points summary for dashboard
router.get("/summary", auth, getImportantPointsSummary);

// Update an important point
router.put("/:id", auth, updateImportantPoint);

// Delete an important point (soft delete)
router.delete("/:id", auth, deleteImportantPoint);

module.exports = router; 