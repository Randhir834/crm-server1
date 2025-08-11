const ImportantPoint = require("../models/ImportantPoint");
const Lead = require("../models/Lead");

// Create a new important point
const createImportantPoint = async (req, res) => {
  try {
    const { leadId, content } = req.body;
    const userId = req.user.id;

    // Validate required fields
    if (!leadId || !content) {
      return res.status(400).json({
        success: false,
        message: "Lead ID and content are required",
      });
    }

    // Check if lead exists
    const lead = await Lead.findById(leadId);
    if (!lead) {
      return res.status(404).json({
        success: false,
        message: "Lead not found",
      });
    }

    // Create the important point
    const importantPoint = new ImportantPoint({
      leadId,
      userId,
      content: content.trim()
    });

    await importantPoint.save();

    // Populate user information
    await importantPoint.populate('userId', 'name');

    console.log(`✅ Important point created for lead ${leadId} by user ${userId}`);

    res.status(201).json({
      success: true,
      message: "Important point created successfully",
      importantPoint
    });
  } catch (error) {
    console.error("Create important point error:", error);
    res.status(500).json({
      success: false,
      message: "Error creating important point",
      error: error.message,
    });
  }
};

// Get all important points for a specific lead
const getImportantPointsByLead = async (req, res) => {
  try {
    const { leadId } = req.params;
    const userId = req.user.id;

    // Check if lead exists
    const lead = await Lead.findById(leadId);
    if (!lead) {
      return res.status(404).json({
        success: false,
        message: "Lead not found",
      });
    }

    // Get important points for this lead
    const importantPoints = await ImportantPoint.findByLead(leadId);

    console.log(`📝 Fetched ${importantPoints.length} important points for lead ${leadId}`);

    res.json({
      success: true,
      importantPoints
    });
  } catch (error) {
    console.error("Get important points by lead error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching important points",
      error: error.message,
    });
  }
};

// Get all important points created by the current user
const getImportantPointsByUser = async (req, res) => {
  try {
    const userId = req.user.id;

    const importantPoints = await ImportantPoint.findByUser(userId);

    console.log(`📝 Fetched ${importantPoints.length} important points for user ${userId}`);

    res.json({
      success: true,
      importantPoints
    });
  } catch (error) {
    console.error("Get important points by user error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching important points",
      error: error.message,
    });
  }
};

// Update an important point
const updateImportantPoint = async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    const userId = req.user.id;

    if (!content) {
      return res.status(400).json({
        success: false,
        message: "Content is required",
      });
    }

    // Find and update the important point (only if created by the current user)
    const importantPoint = await ImportantPoint.findOneAndUpdate(
      { _id: id, userId, isActive: true },
      { content: content.trim() },
      { new: true, runValidators: true }
    ).populate('userId', 'name');

    if (!importantPoint) {
      return res.status(404).json({
        success: false,
        message: "Important point not found or you don't have permission to edit it",
      });
    }

    console.log(`✅ Important point ${id} updated by user ${userId}`);

    res.json({
      success: true,
      message: "Important point updated successfully",
      importantPoint
    });
  } catch (error) {
    console.error("Update important point error:", error);
    res.status(500).json({
      success: false,
      message: "Error updating important point",
      error: error.message,
    });
  }
};

// Delete an important point (soft delete)
const deleteImportantPoint = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Find and soft delete the important point (only if created by the current user)
    const importantPoint = await ImportantPoint.findOneAndUpdate(
      { _id: id, userId, isActive: true },
      { isActive: false },
      { new: true }
    );

    if (!importantPoint) {
      return res.status(404).json({
        success: false,
        message: "Important point not found or you don't have permission to delete it",
      });
    }

    console.log(`🗑️ Important point ${id} deleted by user ${userId}`);

    res.json({
      success: true,
      message: "Important point deleted successfully"
    });
  } catch (error) {
    console.error("Delete important point error:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting important point",
      error: error.message,
    });
  }
};

// Get important points summary for dashboard
const getImportantPointsSummary = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get count of important points by the user
    const totalPoints = await ImportantPoint.countDocuments({ userId, isActive: true });
    
    // Get recent important points
    const recentPoints = await ImportantPoint.find({ userId, isActive: true })
      .populate('leadId', 'name')
      .sort({ createdAt: -1 })
      .limit(5);

    console.log(`📊 Important points summary for user ${userId}: ${totalPoints} total points`);

    res.json({
      success: true,
      summary: {
        totalPoints,
        recentPoints
      }
    });
  } catch (error) {
    console.error("Get important points summary error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching important points summary",
      error: error.message,
    });
  }
};

module.exports = {
  createImportantPoint,
  getImportantPointsByLead,
  getImportantPointsByUser,
  updateImportantPoint,
  deleteImportantPoint,
  getImportantPointsSummary
}; 