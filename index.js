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
const sessionRoutes = require('./routes/sessionRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/leads', leadsRoutes);
app.use('/api/sessions', sessionRoutes);

// MongoDB Atlas connection with proper options
const connectDB = async () => {
  try {

    
    if (!process.env.MONGO_URI) {
      throw new Error('MONGO_URI is not configured in .env file');
    }
    
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      dbName: 'CRM' // Explicitly set database name
    });
    
    
    
    // Start server only after successful database connection
    app.listen(PORT, () => {
      
    });
    
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    
    process.exit(1);
  }
};

// Handle MongoDB connection events
mongoose.connection.on('error', (err) => {
  console.error('❌ MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  
});

// Graceful shutdown
process.on('SIGINT', async () => {
  await mongoose.connection.close();
  
  process.exit(0);
});

// Connect to database
connectDB();
