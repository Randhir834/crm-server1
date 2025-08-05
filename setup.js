const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env');
const envContent = `# MongoDB Atlas Configuration
# Replace with your actual MongoDB Atlas connection string
MONGO_URI=mongodb+srv://your-username:your-password@cluster0.xxxxx.mongodb.net/CRM?retryWrites=true&w=majority

# JWT Secret Key (change this in production)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Server Port
PORT=5001`;

if (!fs.existsSync(envPath)) {
  fs.writeFileSync(envPath, envContent);
  console.log('✅ .env file created successfully!');
  console.log('\n📝 IMPORTANT: Update your .env file with your MongoDB Atlas credentials:');
  console.log('1. Get your connection string from MongoDB Atlas dashboard');
  console.log('2. Replace the MONGO_URI with your actual connection string');
  console.log('3. Update the JWT_SECRET with a secure random string');
  console.log('4. Make sure the database name is "CRM" in your connection string');
} else {
  console.log('ℹ️  .env file already exists.');
}

console.log('\n🔧 Next steps:');
console.log('1. Update your .env file with MongoDB Atlas connection string');
console.log('2. Run "npm run init-db" to initialize the database');
console.log('3. Run "npm run dev" to start the server');
console.log('4. Start the frontend with "cd ../client && npm start"');

console.log('\n📊 MongoDB Atlas Setup:');
console.log('- Database Name: CRM');
console.log('- Collection: users (created automatically)');
console.log('- Indexes: email, createdAt (created automatically)'); 