const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./models/User');

const initDatabase = async () => {
  try {
    console.log('🔌 Connecting to MongoDB Atlas...');
    console.log('📊 Database URI:', process.env.MONGO_URI ? 'Configured' : 'Missing');
    
    if (!process.env.MONGO_URI) {
      throw new Error('MONGO_URI is not configured in .env file');
    }
    
    // Connect to MongoDB Atlas
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      dbName: 'CRM'
    });
    
    console.log(`✅ Connected to MongoDB Atlas: ${conn.connection.host}`);
    console.log(`📊 Database: ${conn.connection.name}`);
    
    // Create indexes
    console.log('📈 Creating database indexes...');
    await User.createIndexes();
    console.log('✅ Indexes created successfully');
    
    // Check existing users
    const userCount = await User.countDocuments();
    console.log(`👥 Current users in database: ${userCount}`);
    
    // Show database collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('📚 Collections in database:');
    collections.forEach(collection => {
      console.log(`   - ${collection.name}`);
    });
    
    console.log('\n🎉 Database initialization completed successfully!');
    console.log('🚀 Your CRM application is ready to use with MongoDB Atlas');
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Database initialization failed:', error.message);
    console.log('\n💡 Troubleshooting tips:');
    console.log('1. Check your MONGO_URI in .env file');
    console.log('2. Verify your MongoDB Atlas credentials');
    console.log('3. Ensure network access is configured in Atlas');
    console.log('4. Make sure the database name is "CRM"');
    process.exit(1);
  }
};

// Run initialization
initDatabase(); 