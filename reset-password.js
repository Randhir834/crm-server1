const mongoose = require('mongoose');
require('dotenv').config();
const User = require('./models/User');

const resetPassword = async () => {
  try {
    console.log('🔌 Connecting to MongoDB Atlas...');
    
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      dbName: 'CRM'
    });
    
    console.log(`✅ Connected to MongoDB Atlas: ${conn.connection.host}`);
    
    // Find the user
    const user = await User.findOne({ email: 'kumarrandhir1705@gmail.com' });
    
    if (!user) {
      console.log('❌ User not found');
      process.exit(1);
    }
    
    console.log('✅ User found:', user.email);
    
    // Update the password
    user.password = '123456';
    await user.save();
    
    console.log('✅ Password updated successfully');
    
    // Test the login
    const isPasswordValid = await user.comparePassword('123456');
    console.log('✅ Password validation test:', isPasswordValid);
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

resetPassword(); 