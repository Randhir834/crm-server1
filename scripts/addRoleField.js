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
    // Get the users collection
    const usersCollection = db.collection('users');
    
    // Count total users
    const totalUsers = await usersCollection.countDocuments({});
    console.log(`Total users in database: ${totalUsers}`);
    
    // Count documents without role field
    const docsWithoutRole = await usersCollection.countDocuments({
      role: { $exists: false }
    });
    
    console.log(`Found ${docsWithoutRole} users without 'role' field`);
    
    if (docsWithoutRole > 0) {
      // Add the role field to all documents that don't have it
      const result = await usersCollection.updateMany(
        { role: { $exists: false } },
        { $set: { role: "user" } }
      );
      
      console.log(`Successfully added 'role' field to ${result.modifiedCount} users`);
      
      // Verify the field was added
      const remainingDocsWithoutRole = await usersCollection.countDocuments({
        role: { $exists: false }
      });
      
      console.log(`Remaining users without 'role' field: ${remainingDocsWithoutRole}`);
      
      if (remainingDocsWithoutRole === 0) {
        console.log('✅ All users now have the role field!');
      } else {
        console.log('⚠️ Some users may still be missing the role field');
      }
    } else {
      console.log('✅ All users already have the role field - database is up to date');
    }
    
    // Also check for users with empty role values and set them to 'user'
    const usersWithEmptyRole = await usersCollection.countDocuments({
      $or: [
        { role: "" },
        { role: null },
        { role: undefined }
      ]
    });
    
    if (usersWithEmptyRole > 0) {
      console.log(`Found ${usersWithEmptyRole} users with empty role values`);
      
      const result = await usersCollection.updateMany(
        {
          $or: [
            { role: "" },
            { role: null },
            { role: undefined }
          ]
        },
        { $set: { role: "user" } }
      );
      
      console.log(`Successfully updated ${result.modifiedCount} users with empty role values`);
    }
    
  } catch (error) {
    console.error('Error adding role field:', error);
  } finally {
    // Close the connection
    mongoose.connection.close();
    console.log('MongoDB connection closed');
  }
}); 