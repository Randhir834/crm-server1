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
    
    // Count total leads
    const totalLeads = await leadsCollection.countDocuments({});
    console.log(`Total leads in database: ${totalLeads}`);
    
    // Count documents without service field
    const docsWithoutService = await leadsCollection.countDocuments({
      service: { $exists: false }
    });
    
    console.log(`Found ${docsWithoutService} leads without 'service' field`);
    
    if (docsWithoutService > 0) {
      // Add the service field to all documents that don't have it
      const result = await leadsCollection.updateMany(
        { service: { $exists: false } },
        { $set: { service: "" } }
      );
      
      console.log(`Successfully added 'service' field to ${result.modifiedCount} leads`);
      
      // Verify the field was added
      const remainingDocsWithoutService = await leadsCollection.countDocuments({
        service: { $exists: false }
      });
      
      console.log(`Remaining leads without 'service' field: ${remainingDocsWithoutService}`);
      
      if (remainingDocsWithoutService === 0) {
        console.log('✅ All leads now have the service field!');
      } else {
        console.log('⚠️ Some leads may still be missing the service field');
      }
    } else {
      console.log('✅ All leads already have the service field - database is up to date');
    }
    
  } catch (error) {
    console.error('Error adding service field:', error);
  } finally {
    // Close the connection
    mongoose.connection.close();
    console.log('MongoDB connection closed');
  }
}); 