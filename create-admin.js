const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./models/User');

const createAdminUser = async () => {
  try {
    console.log('🔌 Connecting to MongoDB...');
    
    if (!process.env.MONGO_URI) {
      throw new Error('MONGO_URI is not configured in .env file');
    }
    
    // Connect to MongoDB
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      dbName: 'CRM'
    });
    
    console.log(`✅ Connected to MongoDB: ${conn.connection.host}`);
    
    // Check if admin user already exists
    const existingAdmin = await User.findOne({ role: 'admin' });
    if (existingAdmin) {
      console.log('👑 Admin user already exists:');
      console.log(`   Name: ${existingAdmin.name}`);
      console.log(`   Email: ${existingAdmin.email}`);
      console.log(`   Role: ${existingAdmin.role}`);
      process.exit(0);
    }
    
    // Create admin user
    const adminUser = new User({
      name: 'Admin User',
      email: 'admin@innovatiqmedia.com',
      password: 'admin123456',
      role: 'admin',
      isActive: true
    });
    
    await adminUser.save();
    
    console.log('👑 Admin user created successfully:');
    console.log(`   Name: ${adminUser.name}`);
    console.log(`   Email: ${adminUser.email}`);
    console.log(`   Role: ${adminUser.role}`);
    console.log('\n🔐 Default credentials:');
    console.log('   Email: admin@innovatiqmedia.com');
    console.log('   Password: admin123456');
    console.log('\n⚠️  Please change the password after first login!');
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Failed to create admin user:', error.message);
    process.exit(1);
  }
};

// Run admin creation
createAdminUser(); 