const Lead = require("../models/Lead");
const xlsx = require("xlsx");
const { validationResult } = require("express-validator");

// Upload and process sheet file
const uploadLeads = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded",
      });
    }

    console.log("📁 File upload details:", {
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
    });

    let workbook;
    let jsonData;

    try {
      // Try to read the file as Excel/CSV
      workbook = xlsx.read(req.file.buffer, {
        type: "buffer",
        cellDates: true,
        cellNF: false,
        cellText: false,
      });

      if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
        return res.status(400).json({
          success: false,
          message: "No sheets found in the file",
        });
      }

      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      jsonData = xlsx.utils.sheet_to_json(worksheet, { header: 1 });

      console.log("✅ File processed successfully:", {
        sheetName,
        totalRows: jsonData.length,
      });
    } catch (parseError) {
      console.error("❌ File parsing error:", parseError);
      return res.status(400).json({
        success: false,
        message:
          "Unable to read the file. Please ensure it is a valid Excel or CSV file.",
        error: parseError.message,
      });
    }

    if (jsonData.length < 2) {
      return res.status(400).json({
        success: false,
        message: "File must contain at least a header row and one data row",
      });
    }

    const headers = jsonData[0].map((header) =>
      header ? header.toString().trim() : ""
    );
    const dataRows = jsonData.slice(1);

    // Map headers to expected fields with flexible matching
    const headerMapping = {
      name: "name",
      "full name": "name",
      "first name": "name",
      "last name": "name",
      "contact name": "name",

      phone: "phone",
      "phone number": "phone",
      mobile: "phone",
      telephone: "phone",

      service: "service",
      services: "service",
      "service type": "service",
      "service category": "service",

      status: "status",
      "lead status": "status",

      notes: "notes",
      note: "notes",
      comments: "notes",
      description: "notes",
    };

    const columnIndexes = {};
    headers.forEach((header, index) => {
      if (!header) return; // Skip empty headers

      const lowerHeader = header.toString().toLowerCase().trim();
      if (headerMapping[lowerHeader]) {
        columnIndexes[headerMapping[lowerHeader]] = index;
      }
    });

    console.log("📋 Header mapping:", {
      headers: headers,
      columnIndexes: columnIndexes,
    });

    // Validate required columns (allow index 0)
    if (typeof columnIndexes.name !== "number") {
      return res.status(400).json({
        success: false,
        message: 'File must contain "Name" column',
      });
    }

    const leads = [];
    const errors = [];

    dataRows.forEach((row, index) => {
      if (!row || row.length === 0) return;

      const lead = {
        name: row["name"] ? row["name"].toString().trim() : "",
        phone: row["phone"] ? row["phone"].toString().trim() : "",
        status: row["status"] ? row["status"].toString().trim() : "New",
        source: row["source"] ? row["source"].toString().trim() : "",
        service: row["service"] ? row["service"].toString().trim() : "", // ✅ Ensure service from Excel is captured
        notes: row["notes"] ? row["notes"].toString().trim() : "",
        assignedTo: req.user.id,
        createdBy: req.user.id,
      };

      // Validate lead data
      if (!lead.name || lead.name.length < 2) {
        errors.push(
          `Row ${index + 2}: Name is required and must be at least 2 characters`
        );
        return;
      }

      // Validate status
      const validStatuses = [
        "New",
        "Qualified",
        "Negotiation",
        "Closed",
        "Lost",
      ];
      if (lead.status && !validStatuses.includes(lead.status)) {
        lead.status = "New";
      }

      leads.push(lead);
    });

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Validation errors found",
        errors,
      });
    }

    if (leads.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid leads found in the file",
      });
    }

    // Insert leads
    const insertedLeads = await Lead.insertMany(leads);

    console.log(`✅ Successfully inserted ${insertedLeads.length} leads`);

    // Fetch the inserted leads with populated user data
    try {
      const populatedLeads = await Lead.find({
        _id: { $in: insertedLeads.map((lead) => lead._id) },
      })
        .populate("createdBy", "name")
        .populate("assignedTo", "name")
        .sort({ createdAt: -1 });

      console.log(
        `✅ Fetched ${populatedLeads.length} leads with populated user data`
      );

      res.status(201).json({
        success: true,
        message: `Successfully imported ${insertedLeads.length} leads`,
        count: insertedLeads.length,
        leads: populatedLeads,
      });
    } catch (populateError) {
      console.error("❌ Error populating user data:", populateError);
      // Fallback to unpopulated leads if population fails
      res.status(201).json({
        success: true,
        message: `Successfully imported ${insertedLeads.length} leads`,
        count: insertedLeads.length,
        leads: insertedLeads,
      });
    }
  } catch (error) {
    console.error("Upload leads error:", error);
    res.status(500).json({
      success: false,
      message: "Error processing file",
      error: error.message,
    });
  }
};

// Get all leads
const getLeads = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const status = req.query.status;
    const search = req.query.search;

    // Build query based on user role
    let query = { isActive: true };

    // If user is not admin, only show leads assigned to them or created by them
    if (req.user.role !== "admin") {
      query.$or = [{ createdBy: req.user._id }, { assignedTo: req.user._id }];
    }

    if (status) {
      query.status = status;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
        { service: { $regex: search, $options: "i" } },
        { notes: { $regex: search, $options: "i" } },
      ];
    }

    // If limit is very high (like 1000), don't use pagination to show all data
    let leadsQuery = Lead.find(query)
      .populate("createdBy", "name")
      .populate("assignedTo", "name")
      .sort({ createdAt: -1 });

    if (limit < 1000) {
      const skip = (page - 1) * limit;
      leadsQuery = leadsQuery.skip(skip).limit(limit);
    }

    const leads = await leadsQuery;
    const total = await Lead.countDocuments(query);

    console.log(
      `Leads fetched: ${leads.length} leads, total: ${total}, filter: ${
        status || "all"
      }`
    );
    console.log(
      "Sample leads:",
      leads
        .slice(0, 3)
        .map((lead) => ({ id: lead._id, name: lead.name, status: lead.status }))
    );

    // Add cache control headers to prevent unnecessary API calls
    res.set({
      "Cache-Control": "no-cache, no-store, must-revalidate",
      Pragma: "no-cache",
      Expires: "0",
    });

    res.json({
      success: true,
      leads,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get leads error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching leads",
      error: error.message,
    });
  }
};

// Get lead statistics
const getLeadStats = async (req, res) => {
  try {
    // Build match condition based on user role
    let matchCondition = { isActive: true };

    // If user is not admin, only show stats for leads assigned to them or created by them
    if (req.user.role !== "admin") {
      matchCondition.$or = [
        { createdBy: req.user._id },
        { assignedTo: req.user._id },
      ];
    }

    const stats = await Lead.aggregate([
      { $match: matchCondition },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    const totalLeads = await Lead.countDocuments(matchCondition);

    const statsMap = {
      total: totalLeads,
      new: 0,
      qualified: 0,
      negotiation: 0,
      closed: 0,
      lost: 0,
    };

    stats.forEach((stat) => {
      if (stat._id) {
        const statusKey = stat._id.toLowerCase();
        if (statsMap.hasOwnProperty(statusKey)) {
          statsMap[statusKey] = stat.count;
        }
      }
    });

    console.log(
      "Lead stats for user:",
      req.user._id,
      "role:",
      req.user.role,
      statsMap
    );

    // Add cache control headers to prevent unnecessary API calls
    res.set({
      "Cache-Control": "no-cache, no-store, must-revalidate",
      Pragma: "no-cache",
      Expires: "0",
    });

    res.json({
      success: true,
      stats: statsMap,
    });
  } catch (error) {
    console.error("Get lead stats error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching lead statistics",
      error: error.message,
    });
  }
};

// Get single lead
const getLead = async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id)
      .populate("createdBy", "name")
      .populate("assignedTo", "name");

    if (!lead) {
      return res.status(404).json({
        success: false,
        message: "Lead not found",
      });
    }

    res.json({
      success: true,
      lead,
    });
  } catch (error) {
    console.error("Get lead error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching lead",
      error: error.message,
    });
  }
};

// Update lead
const updateLead = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation errors",
        errors: errors.array(),
      });
    }

    const lead = await Lead.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    })
      .populate("createdBy", "name")
      .populate("assignedTo", "name");

    if (!lead) {
      return res.status(404).json({
        success: false,
        message: "Lead not found",
      });
    }

    res.json({
      success: true,
      message: "Lead updated successfully",
      lead,
    });
  } catch (error) {
    console.error("Update lead error:", error);
    res.status(500).json({
      success: false,
      message: "Error updating lead",
      error: error.message,
    });
  }
};

// Update lead status
const updateLeadStatus = async (req, res) => {
  try {
    const { status } = req.body;

    // Validate status
    const validStatuses = ["New", "Qualified", "Negotiation", "Closed", "Lost"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status. Must be one of: " + validStatuses.join(", "),
      });
    }

    // Use findOneAndUpdate with optimistic locking to prevent race conditions
    const lead = await Lead.findOneAndUpdate(
      { _id: req.params.id, isActive: true },
      {
        status,
        updatedAt: new Date(), // Ensure timestamp is updated
      },
      {
        new: true,
        runValidators: true,
        // Add optimistic locking to prevent concurrent updates
        timestamps: true,
      }
    )
      .populate("createdBy", "name")
      .populate("assignedTo", "name");

    if (!lead) {
      return res.status(404).json({
        success: false,
        message: "Lead not found",
      });
    }

    // Add cache control headers
    res.set({
      "Cache-Control": "no-cache, no-store, must-revalidate",
      Pragma: "no-cache",
      Expires: "0",
    });

    res.json({
      success: true,
      message: "Lead status updated successfully",
      lead,
    });
  } catch (error) {
    console.error("Update lead status error:", error);
    res.status(500).json({
      success: false,
      message: "Error updating lead status",
      error: error.message,
    });
  }
};

// Delete lead (hard delete - completely remove from database)
const deleteLead = async (req, res) => {
  try {
    const lead = await Lead.findByIdAndDelete(req.params.id);

    if (!lead) {
      return res.status(404).json({
        success: false,
        message: "Lead not found",
      });
    }

    res.json({
      success: true,
      message: "Lead deleted successfully",
    });
  } catch (error) {
    console.error("Delete lead error:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting lead",
      error: error.message,
    });
  }
};

// Export leads
const exportLeads = async (req, res) => {
  try {
    const leads = await Lead.find({ isActive: true })
      .populate("createdBy", "name")
      .populate("assignedTo", "name")
      .sort({ createdAt: -1 });

    const workbook = xlsx.utils.book_new();
    const worksheetData = leads.map((lead) => ({
      Name: lead.name,

      Phone: lead.phone,
      Service: lead.service,
      Status: lead.status,

      Notes: lead.notes,
      "Uploaded By": lead.createdBy ? lead.createdBy.name : "Unknown",
      "Assigned To": lead.assignedTo ? lead.assignedTo.name : "",
      "Created Date": lead.createdAt.toISOString().split("T")[0],
      "Last Updated": lead.updatedAt.toISOString().split("T")[0],
    }));

    const worksheet = xlsx.utils.json_to_sheet(worksheetData);
    xlsx.utils.book_append_sheet(workbook, worksheet, "Leads");

    const buffer = xlsx.write(workbook, { type: "buffer", bookType: "xlsx" });

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=leads_export_${
        new Date().toISOString().split("T")[0]
      }.xlsx`
    );
    res.send(buffer);
  } catch (error) {
    console.error("Export leads error:", error);
    res.status(500).json({
      success: false,
      message: "Error exporting leads",
      error: error.message,
    });
  }
};

// Soft delete lead (mark as inactive but keep in database)
const softDeleteLead = async (req, res) => {
  try {
    const lead = await Lead.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );

    if (!lead) {
      return res.status(404).json({
        success: false,
        message: "Lead not found",
      });
    }

    res.json({
      success: true,
      message: "Lead deactivated successfully",
    });
  } catch (error) {
    console.error("Soft delete lead error:", error);
    res.status(500).json({
      success: false,
      message: "Error deactivating lead",
      error: error.message,
    });
  }
};

module.exports = {
  uploadLeads,
  getLeads,
  getLeadStats,
  getLead,
  updateLead,
  updateLeadStatus,
  deleteLead,
  softDeleteLead,
  exportLeads,
};
