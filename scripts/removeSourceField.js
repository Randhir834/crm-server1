const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/crm-app', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const db = mongoose.connection;

db.on('error', console.error.bind(console, 'MongoDB connection error:'));
db.once('open', async () => {
  console.log('Connected to MongoDB');
  
  try {
    // Get the leads collection
    const leadsCollection = db.collection('leads');
    
    // Count documents with source field
    const docsWithSource = await leadsCollection.countDocuments({
      source: { $exists: true }
    });
    
    console.log(`Found ${docsWithSource} leads with 'source' field`);
    
    if (docsWithSource > 0) {
      // Remove the source field from all documents
      const result = await leadsCollection.updateMany(
        { source: { $exists: true } },
        { $unset: { source: "" } }
      );
      
      console.log(`Successfully removed 'source' field from ${result.modifiedCount} leads`);
      
      // Verify the field was removed
      const remainingDocsWithSource = await leadsCollection.countDocuments({
        source: { $exists: true }
      });
      
      console.log(`Remaining leads with 'source' field: ${remainingDocsWithSource}`);
      
      if (remainingDocsWithSource === 0) {
        console.log('✅ All source fields have been successfully removed!');
      } else {
        console.log('⚠️ Some source fields may still exist');
      }
    } else {
      console.log('✅ No leads with source field found - database is already clean');
    }
    
  } catch (error) {
    console.error('Error removing source field:', error);
  } finally {
    // Close the connection
    mongoose.connection.close();
    console.log('MongoDB connection closed');
  }
}); 