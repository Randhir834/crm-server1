const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));

app.get('/', (req, res) => {
  res.send('CRM API running...');
});



// Import routes here
const authRoutes = require('./routes/authRoutes');
const leadsRoutes = require('./routes/leadsRoutes');
const callScheduleRoutes = require('./routes/callScheduleRoutes');
const sessionRoutes = require('./routes/sessionRoutes');
const customerRoutes = require('./routes/customerRoutes');
const chatRoutes = require('./routes/chatRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/leads', leadsRoutes);
app.use('/api/call-schedules', callScheduleRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/chats', chatRoutes);

// MongoDB Atlas connection with proper options
const connectDB = async () => {
  try {
    console.log('🔌 Connecting to MongoDB Atlas...');
    console.log('📊 Database URI:', process.env.MONGO_URI ? 'Configured' : 'Missing');
    
    if (!process.env.MONGO_URI) {
      throw new Error('MONGO_URI is not configured in .env file');
    }
    
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      dbName: 'CRM' // Explicitly set database name
    });
    
    console.log(`✅ MongoDB Atlas Connected: ${conn.connection.host}`);
    console.log(`📊 Database: ${conn.connection.name}`);
    
    // Start server only after successful database connection
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`🌐 API URL: http://localhost:${PORT}`);
    });
    
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    console.log('\n💡 Troubleshooting tips:');
    console.log('1. Check your MONGO_URI in .env file');
    console.log('2. Verify your MongoDB Atlas credentials');
    console.log('3. Ensure network access is configured in Atlas');
    console.log('4. Make sure the database name is "CRM"');
    process.exit(1);
  }
};

// Handle MongoDB connection events
mongoose.connection.on('error', (err) => {
  console.error('❌ MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('⚠️ MongoDB disconnected');
});

// Graceful shutdown
process.on('SIGINT', async () => {
  await mongoose.connection.close();
  console.log('📴 MongoDB connection closed through app termination');
  process.exit(0);
});

// Connect to database
connectDB();
