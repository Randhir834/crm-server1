/**
 * Leads Controller
 * 
 * Handles all lead-related operations including:
 * - Lead creation and import from Excel/CSV
 * - Lead retrieval, filtering, and pagination
 * - Lead updates and status changes
 * - Lead deletion (soft and hard)
 * - Lead statistics and reporting
 * - Lead export to Excel
 */

const Lead = require('../models/Lead');
const Customer = require('../models/Customer');
const xlsx = require('xlsx');
const { validationResult } = require('express-validator');

/**
 * Upload and process leads from Excel/CSV file
 * @route POST /api/leads/upload
 * @access Private
 */
const uploadLeads = async (req, res) => {
  try {
    // Validate file exists
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        message: 'No file uploaded' 
      });
    }

    console.log('📁 File upload details:', {
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size
    });

    let workbook;
    let jsonData;

    try {
      // Determine file type from extension and mimetype for more reliable detection
      const fileExtension = req.file.originalname.toLowerCase().substring(req.file.originalname.lastIndexOf('.'));
      const isCSV = fileExtension === '.csv' || req.file.mimetype.includes('csv');
      const isExcel = ['.xlsx', '.xls'].includes(fileExtension) || 
                     req.file.mimetype.includes('excel') || 
                     req.file.mimetype.includes('spreadsheet');
      
      if (!isCSV && !isExcel) {
        return res.status(400).json({ 
          success: false,
          message: 'Unsupported file format. Please upload a CSV or Excel file.',
          supportedFormats: '.csv, .xlsx, .xls'
        });
      }
      
      // Enhanced options for reading files with better format handling
      const readOptions = { 
        type: 'buffer',
        cellDates: true,     // Parse dates as Date objects
        cellNF: false,       // Don't parse number formats
        cellText: false,     // Don't generate formatted text
        raw: true,           // Keep raw values for better data integrity
        dateNF: 'yyyy-mm-dd',// Date format string
        cellStyles: false,   // Don't parse styles for better performance
        // For CSV files, add specific options
        ...(isCSV && {
          codepage: 65001,    // UTF-8
          raw: true,         // Keep raw values for CSV
          rawNumbers: true,  // Don't convert numbers for CSV
          strip: false,      // Don't strip whitespace
          blankrows: true    // Keep blank rows for consistent row indexing
        })
      };
      
      // Try to read the file as Excel/CSV with enhanced options
      workbook = xlsx.read(req.file.buffer, readOptions);
      
      if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No sheets found in the file'
        });
      }

      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      // Enhanced options for sheet_to_json with better handling of different data types
      jsonData = xlsx.utils.sheet_to_json(worksheet, { 
        header: 1,          // Use array format
        defval: '',         // Default value for empty cells
        blankrows: true,    // Keep blank rows for consistent row indexing
        raw: true,          // Keep raw values for better data integrity
        rawNumbers: true    // Don't convert numbers to avoid precision issues
      });

      console.log('✅ File processed successfully:', {
        sheetName,
        totalRows: jsonData.length
      });

    } catch (parseError) {
      console.error('❌ File parsing error:', parseError);
      return res.status(400).json({
        success: false,
        message: 'Unable to read the file. Please ensure it is a valid Excel or CSV file.',
        error: parseError.message
      });
    }

    if (jsonData.length < 1) {
      return res.status(400).json({
        success: false,
        message: 'File must contain at least a header row'
      });
    }
    
    // **MODIFIED**: Robust header detection logic
    let headerRowIndex = -1;
    let headers = [];
    // Scan the first 10 rows to find a suitable header
    for (let i = 0; i < Math.min(10, jsonData.length); i++) {
        const potentialHeaders = jsonData[i].map(h => h ? h.toString().trim() : '');
        const nonEmptyHeaders = potentialHeaders.filter(h => h);
        // A plausible header row should have at least 2 non-empty columns
        if (nonEmptyHeaders.length >= 2) {
            headers = potentialHeaders;
            headerRowIndex = i;
            break;
        }
    }
    
    // If we still don't have a header row, return an error
    if (headerRowIndex === -1) {
      return res.status(400).json({
        success: false,
        message: 'Could not find a valid header row. Please ensure column headers (like "Name", "Email") are within the first 10 rows of the file.'
      });
    }
    
    // Data rows start after the header row
    const dataRows = jsonData.slice(headerRowIndex + 1).filter(row => 
      row && row.length > 0 && row.some(cell => cell && cell.toString().trim() !== '')
    );
    
    if (dataRows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'File must contain at least one data row'
      });
    }

    // Enhanced header mapping with more variations
    const headerMapping = {
      // Name variations
      'name': 'name',
      'full name': 'name',
      'first name': 'name',
      'firstname': 'name',
      'first': 'name',
      'last name': 'name',
      'lastname': 'name',
      'last': 'name',
      'contact name': 'name',
      'contact': 'name',
      'customer name': 'name',
      'customer': 'name',
      'lead name': 'name',
      'lead': 'name',
      'person': 'name',
      'client': 'name',
      'client name': 'name',
      
      // Email variations
      'email': 'email',
      'email address': 'email',
      'e-mail': 'email',
      'e-mail address': 'email',
      'mail': 'email',
      'contact email': 'email',
      'customer email': 'email',
      'lead email': 'email',
      'client email': 'email',
      
      // Phone variations
      'phone': 'phone',
      'phone number': 'phone',
      'phonenumber': 'phone',
      'telephone': 'phone',
      'tel': 'phone',
      'mobile': 'phone',
      'mobile number': 'phone',
      'mobilenumber': 'phone',
      'cell': 'phone',
      'cell phone': 'phone',
      'contact phone': 'phone',
      'customer phone': 'phone',
      'lead phone': 'phone',
      'client phone': 'phone',
      
      // Company variations
      'company': 'company',
      'company name': 'company',
      'companyname': 'company',
      'business': 'company',
      'business name': 'company',
      'organization': 'company',
      'organisation': 'company',
      'org': 'company',
      'firm': 'company',
      'employer': 'company',
      
      // Status variations
      'status': 'status',
      'lead status': 'status',
      'leadstatus': 'status',
      'state': 'status',
      'stage': 'status',
      'phase': 'status',
      
      // Source variations
      'source': 'source',
      'lead source': 'source',
      'leadsource': 'source',
      'origin': 'source',
      'channel': 'source',
      'campaign': 'source',
      'acquisition': 'source',
      'referral': 'source',
      'referrer': 'source',
      
      // Notes variations
      'notes': 'notes',
      'note': 'notes',
      'comments': 'notes',
      'comment': 'notes',
      'description': 'notes',
      'desc': 'notes',
      'details': 'notes',
      'additional info': 'notes',
      'additional information': 'notes',
      'remarks': 'notes',
      'observations': 'notes'
    };

    // Map headers to column indexes with improved matching
    const columnIndexes = {};
    headers.forEach((header, index) => {
      if (!header) return; // Skip empty headers
      
      // Clean and normalize the header
      const lowerHeader = header.toString().toLowerCase().trim();
      
      // Direct match
      if (headerMapping[lowerHeader]) {
        columnIndexes[headerMapping[lowerHeader]] = index;
        return;
      }
      
      // Partial match - check if the header contains any of our known keys
      for (const [key, value] of Object.entries(headerMapping)) {
        if (lowerHeader.includes(key)) {
          columnIndexes[value] = index;
          return;
        }
      }
    });

    console.log('📋 Header mapping:', {
      headerRowIndex: headerRowIndex,
      headers: headers,
      columnIndexes: columnIndexes,
      dataRowsCount: dataRows.length
    });

    // Validate required columns (allow index 0)
    if (typeof columnIndexes.name !== 'number' || typeof columnIndexes.email !== 'number') {
      return res.status(400).json({
        success: false,
        message: 'File must contain "Name" and "Email" columns',
        detectedColumns: headers.filter(h => h) // **MODIFIED**: Return detected headers to help user
      });
    }

    const leads = [];
    const errors = [];
    const validStatuses = ['New', 'Qualified', 'Negotiation', 'Closed', 'Lost'];
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

    // Process each data row
    dataRows.forEach((row, index) => {
      if (!row || row.length === 0) return;
      
      // Helper function to safely extract and clean cell data
      const getCellValue = (columnIndex) => {
        if (typeof columnIndex !== 'number' || columnIndex < 0 || columnIndex >= row.length) {
          return '';
        }
        
        const cellValue = row[columnIndex];
        if (cellValue === null || cellValue === undefined) {
          return '';
        }
        
        // Handle different data types
        if (typeof cellValue === 'string') {
          return cellValue.trim();
        } else if (typeof cellValue === 'number') {
          return cellValue.toString();
        } else if (cellValue instanceof Date) {
          return cellValue.toISOString().split('T')[0]; // Format as YYYY-MM-DD
        } else {
          return cellValue.toString().trim();
        }
      };

      // Extract and clean lead data
      const leadData = {
        name: getCellValue(columnIndexes.name),
        email: getCellValue(columnIndexes.email).toLowerCase(),
        phone: columnIndexes.phone !== undefined ? getCellValue(columnIndexes.phone) : '',
        company: columnIndexes.company !== undefined ? getCellValue(columnIndexes.company) : '',
        status: columnIndexes.status !== undefined ? getCellValue(columnIndexes.status) : 'New',
        source: columnIndexes.source !== undefined ? getCellValue(columnIndexes.source) : 'Import',
        notes: columnIndexes.notes !== undefined ? getCellValue(columnIndexes.notes) : '',
        createdBy: req.user.id
      };

      // Validate name
      if (!leadData.name || leadData.name.length < 2) {
        errors.push(`Row ${index + headerRowIndex + 2}: Name is required and must be at least 2 characters`);
        return;
      }

      // Validate email with a more comprehensive regex
      if (!leadData.email || !emailRegex.test(leadData.email)) {
        errors.push(`Row ${index + headerRowIndex + 2}: Valid email is required (${leadData.email})`);
        return;
      }

      // Normalize and validate status
      if (leadData.status) {
        // Try to match status case-insensitively
        const normalizedStatus = leadData.status.trim();
        const matchedStatus = validStatuses.find(status => 
          status.toLowerCase() === normalizedStatus.toLowerCase()
        );
        
        if (matchedStatus) {
          // Use the correctly cased status
          leadData.status = matchedStatus;
        } else {
          // Default to 'New' if status is invalid
          leadData.status = 'New';
        }
      } else {
        leadData.status = 'New';
      }

      // Sanitize other fields
      // Limit field lengths to prevent database issues
      leadData.name = leadData.name.substring(0, 100);
      leadData.email = leadData.email.substring(0, 100);
      leadData.phone = leadData.phone.substring(0, 20);
      leadData.company = leadData.company.substring(0, 100);
      leadData.source = leadData.source.substring(0, 50);
      leadData.notes = leadData.notes.substring(0, 1000);

      leads.push(leadData);
    });

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors found',
        errors,
        detectedColumns: headers.filter(h => h) // **MODIFIED**: Also return detected headers on validation failure
      });
    }

    if (leads.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid leads found in the file'
      });
    }

    // Check for duplicate emails
    const duplicateEmails = [];
    const uniqueEmails = new Set();
    const duplicateEmailDetails = [];
    
    leads.forEach((lead, index) => {
      const lowerCaseEmail = lead.email.toLowerCase();
      
      if (uniqueEmails.has(lowerCaseEmail)) {
        duplicateEmails.push(lowerCaseEmail);
        duplicateEmailDetails.push({
          email: lowerCaseEmail,
          rowIndex: index + headerRowIndex + 2, // +2 for 1-indexing and header row
          name: lead.name
        });
      } else {
        uniqueEmails.add(lowerCaseEmail);
      }
    });
    
    // Check for existing emails in the database
    const existingEmails = [];
    const existingEmailDetails = [];
    
    if (uniqueEmails.size > 0) {
      try {
        const existingLeads = await Lead.find({
          email: { $in: Array.from(uniqueEmails).map(email => new RegExp(`^${email}$`, 'i')) }, // Case-insensitive search
          isActive: true
        }).select('email name');
        
        existingLeads.forEach(lead => {
          const lowerCaseEmail = lead.email.toLowerCase();
          existingEmails.push(lowerCaseEmail);
          existingEmailDetails.push({
            email: lowerCaseEmail,
            existingName: lead.name
          });
          uniqueEmails.delete(lowerCaseEmail);
        });
      } catch (dbError) {
        console.error('Database error when checking existing emails:', dbError);
        return res.status(500).json({
          success: false,
          message: 'Error checking existing leads in database',
          error: dbError.message
        });
      }
    }
    
    // Filter out leads with duplicate or existing emails
    const validLeads = leads.filter(lead => {
      const lowerCaseEmail = lead.email.toLowerCase();
      return !duplicateEmails.includes(lowerCaseEmail) && 
             !existingEmails.includes(lowerCaseEmail);
    });
    
    // Insert valid leads
    let insertedCount = 0;
    if (validLeads.length > 0) {
      try {
        const result = await Lead.insertMany(validLeads, { ordered: false });
        insertedCount = result.length;
      } catch (insertError) {
        console.error('Error inserting leads:', insertError);
        // If some documents were inserted before the error
        if (insertError.insertedDocs) {
          insertedCount = insertError.insertedDocs.length;
        }
        
        return res.status(207).json({ // 207 Multi-Status
          success: true,
          message: `Partial import: ${insertedCount} out of ${validLeads.length} leads imported successfully`,
          error: insertError.message,
          totalRows: dataRows.length,
          validLeads: insertedCount,
          errors: errors.length > 0 ? errors : null,
          duplicateEmails: duplicateEmailDetails.length > 0 ? 
            duplicateEmailDetails.slice(0, 10).concat(duplicateEmailDetails.length > 10 ? 
              [{message: `...and ${duplicateEmailDetails.length - 10} more duplicate emails`}] : []) : null,
          existingEmails: existingEmailDetails.length > 0 ? 
            existingEmailDetails.slice(0, 10).concat(existingEmailDetails.length > 10 ? 
              [{message: `...and ${existingEmailDetails.length - 10} more existing emails`}] : []) : null
        });
      }
    }
    
    // Prepare detailed response with limited number of errors/duplicates to avoid overwhelming response
    const limitedErrors = errors.length > 10 ? 
      errors.slice(0, 10).concat([`...and ${errors.length - 10} more validation errors`]) : 
      errors;
      
    const limitedDuplicates = duplicateEmailDetails.length > 10 ? 
      duplicateEmailDetails.slice(0, 10).concat([{message: `...and ${duplicateEmailDetails.length - 10} more duplicate emails`}]) : 
      duplicateEmailDetails;
      
    const limitedExisting = existingEmailDetails.length > 10 ? 
      existingEmailDetails.slice(0, 10).concat([{message: `...and ${existingEmailDetails.length - 10} more existing emails`}]) : 
      existingEmailDetails;
    
    return res.status(200).json({
      success: true,
      message: `${validLeads.length} leads imported successfully`,
      totalRows: dataRows.length,
      validLeads: validLeads.length,
      errors: errors.length > 0 ? limitedErrors : null,
      duplicateEmails: duplicateEmailDetails.length > 0 ? limitedDuplicates : null,
      existingEmails: existingEmailDetails.length > 0 ? limitedExisting : null,
      summary: {
        total: dataRows.length,
        valid: validLeads.length,
        invalid: errors.length,
        duplicates: duplicateEmailDetails.length,
        existing: existingEmailDetails.length
      }
    });

  } catch (error) {
    console.error('Upload leads error:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing file',
      error: error.message
    });
  }
};

/**
 * Get all leads with pagination, filtering, and search
 * @route GET /api/leads
 * @access Private
 */
const getLeads = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const status = req.query.status;
    const search = req.query.search;

    // Build query based on user role
    let query = { isActive: true };
    
    // If user is not admin, only show their own leads
    if (req.user.role !== 'admin') {
      query.createdBy = req.user._id;
    }

    if (status) {
      query.status = status;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { company: { $regex: search, $options: 'i' } }
      ];
    }

    // If limit is very high (like 1000), don't use pagination to show all data
    let leadsQuery = Lead.find(query)
      .populate('createdBy', 'name email')
      .populate('assignedTo', 'name email')
      .sort({ createdAt: -1 });

    if (limit < 1000) {
      const skip = (page - 1) * limit;
      leadsQuery = leadsQuery.skip(skip).limit(limit);
    }

    const leads = await leadsQuery;
    const total = await Lead.countDocuments(query);

    console.log(`Leads fetched: ${leads.length} leads, total: ${total}, filter: ${status || 'all'}`);

    res.json({
      success: true,
      leads,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get leads error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching leads',
      error: error.message
    });
  }
};

/**
 * Get lead statistics by status
 * @route GET /api/leads/stats
 * @access Private
 */
const getLeadStats = async (req, res) => {
  try {
    // Build match condition based on user role
    let matchCondition = { isActive: true };
    
    // If user is not admin, only show their own stats
    if (req.user.role !== 'admin') {
      matchCondition.createdBy = req.user._id;
    }

    const stats = await Lead.aggregate([
      { $match: matchCondition },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const totalLeads = await Lead.countDocuments(matchCondition);

    const statsMap = {
      total: totalLeads,
      new: 0,
      qualified: 0,
      negotiation: 0,
      closed: 0,
      lost: 0
    };

    stats.forEach(stat => {
      if (stat._id) {
        const statusKey = stat._id.toLowerCase();
        if (statsMap.hasOwnProperty(statusKey)) {
          statsMap[statusKey] = stat.count;
        }
      }
    });

    console.log('Lead stats for user:', req.user._id, 'role:', req.user.role, statsMap);

    res.json({
      success: true,
      stats: statsMap
    });

  } catch (error) {
    console.error('Get lead stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching lead statistics',
      error: error.message
    });
  }
};

/**
 * Get a single lead by ID
 * @route GET /api/leads/:id
 * @access Private
 */
const getLead = async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id)
      .populate('createdBy', 'name email')
      .populate('assignedTo', 'name email');

    if (!lead) {
      return res.status(404).json({
        success: false,
        message: 'Lead not found'
      });
    }

    res.json({
      success: true,
      lead
    });

  } catch (error) {
    console.error('Get lead error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching lead',
      error: error.message
    });
  }
};

/**
 * Update a lead
 * @route PUT /api/leads/:id
 * @access Private
 */
const updateLead = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const lead = await Lead.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('createdBy', 'name email')
     .populate('assignedTo', 'name email');

    if (!lead) {
      return res.status(404).json({
        success: false,
        message: 'Lead not found'
      });
    }

    res.json({
      success: true,
      message: 'Lead updated successfully',
      lead
    });

  } catch (error) {
    console.error('Update lead error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating lead',
      error: error.message
    });
  }
};

/**
 * Update a lead's status
 * @route PATCH /api/leads/:id/status
 * @access Private
 */
const updateLeadStatus = async (req, res) => {
  try {
    const { status } = req.body;
    
    // Validate status
    const validStatuses = ['New', 'Qualified', 'Negotiation', 'Closed', 'Lost'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be one of: ' + validStatuses.join(', ')
      });
    }

    const lead = await Lead.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true }
    ).populate('createdBy', 'name email')
     .populate('assignedTo', 'name email');

    if (!lead) {
      return res.status(404).json({
        success: false,
        message: 'Lead not found'
      });
    }

    // If status is 'Qualified', automatically convert to customer
    if (status === 'Qualified') {
      try {
        // Check if customer already exists with this email
        const existingCustomer = await Customer.findByEmail(lead.email);
        if (existingCustomer) {
          console.log(`⚠️ Customer already exists with email: ${lead.email}`);
        } else {
          // Check if lead is already converted
          const existingCustomerByLead = await Customer.findByLeadId(lead._id);
          if (!existingCustomerByLead) {
            // Create new customer from lead
            const customer = new Customer({
              name: lead.name,
              email: lead.email,
              phone: lead.phone,
              company: lead.company,
              status: 'active',
              notes: `Converted from qualified lead: ${lead.notes || 'No notes'}`,
              convertedFrom: {
                leadId: lead._id,
                convertedAt: new Date()
              },
              userId: req.user._id
            });

            await customer.save();
            console.log(`✅ Lead automatically converted to customer: ${lead.email}`);
          }
        }
      } catch (conversionError) {
        console.error('❌ Error converting lead to customer:', conversionError);
        // Don't fail the lead status update if customer conversion fails
      }
    }

    res.json({
      success: true,
      message: 'Lead status updated successfully',
      lead
    });

  } catch (error) {
    console.error('Update lead status error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating lead status',
      error: error.message
    });
  }
};

/**
 * Delete a lead (hard delete)
 * @route DELETE /api/leads/:id
 * @access Private
 */
const deleteLead = async (req, res) => {
  try {
    const lead = await Lead.findByIdAndDelete(req.params.id);

    if (!lead) {
      return res.status(404).json({
        success: false,
        message: 'Lead not found'
      });
    }

    res.json({
      success: true,
      message: 'Lead deleted successfully'
    });

  } catch (error) {
    console.error('Delete lead error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting lead',
      error: error.message
    });
  }
};

/**
 * Soft delete a lead (mark as inactive)
 * @route PATCH /api/leads/:id/deactivate
 * @access Private
 */
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
        message: 'Lead not found'
      });
    }

    res.json({
      success: true,
      message: 'Lead deactivated successfully'
    });

  } catch (error) {
    console.error('Soft delete lead error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deactivating lead',
      error: error.message
    });
  }
};

/**
 * Export leads to Excel
 * @route GET /api/leads/export/excel
 * @access Private
 */
const exportLeads = async (req, res) => {
  try {
    // Get query parameters for filtering
    const { status } = req.query;
    
    // Build filter object
    const filter = { isActive: true };
    if (status && status !== 'All') {
      filter.status = status;
    }
    
    // Get leads with filtering
    const leads = await Lead.find(filter)
      .populate('createdBy', 'name')
      .populate('assignedTo', 'name')
      .sort({ createdAt: -1 }); // Sort by newest first
    
    if (leads.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'No leads found to export' 
      });
    }
    
    // **MODIFIED**: More robust date formatting helper function
    const formatDate = (dateString) => {
        if (!dateString) return '';
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return ''; // Invalid date
            // Format to 'YYYY-MM-DD HH:mm'
            const pad = (num) => num.toString().padStart(2, '0');
            return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
        } catch (e) {
            return '';
        }
    };
    
    // Prepare data for export with better formatting
    const worksheetData = leads.map(lead => ({
      'Name': lead.name || '',
      'Email': lead.email || '',
      'Phone': lead.phone || '',
      'Company': lead.company || '',
      'Status': lead.status || '',
      'Source': lead.source || '',
      'Notes': lead.notes || '',
      'Created By': lead.createdBy ? lead.createdBy.name : '',
      'Assigned To': lead.assignedTo ? lead.assignedTo.name : '',
      'Created Date': formatDate(lead.createdAt),
      'Last Updated': formatDate(lead.updatedAt)
    }));
    
    // Create a new workbook with styling
    const workbook = xlsx.utils.book_new();
    const worksheet = xlsx.utils.json_to_sheet(worksheetData);
    
    // Set column widths for better readability
    const columnWidths = [
      { wch: 20 }, // Name
      { wch: 25 }, // Email
      { wch: 15 }, // Phone
      { wch: 20 }, // Company
      { wch: 12 }, // Status
      { wch: 15 }, // Source
      { wch: 30 }, // Notes
      { wch: 15 }, // Created By
      { wch: 15 }, // Assigned To
      { wch: 20 }, // Created Date
      { wch: 20 }  // Last Updated
    ];
    
    worksheet['!cols'] = columnWidths;
    
    // Add the worksheet to the workbook
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Leads');
    
    // Generate buffer with better compatibility options
    const buffer = xlsx.write(workbook, { 
      type: 'buffer', 
      bookType: 'xlsx',
      compression: true // Enable compression for smaller file size
    });
    
    // Generate timestamp for unique filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `leads_export_${timestamp}.xlsx`;
    
    // Set headers for file download with better browser compatibility
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', buffer.length);
    res.setHeader('Cache-Control', 'no-cache');
    
    // Send the file
    res.send(buffer);
  } catch (error) {
    console.error('Export leads error:', error);
    res.status(500).json({
      success: false,
      message: 'Error exporting leads',
      error: error.message
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
  exportLeads
};