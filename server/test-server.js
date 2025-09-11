const mongoose = require('mongoose');
require('dotenv').config({ path: '../.env.local' });

const testConnection = async () => {
  try {
    console.log('Testing database connection...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Database connection successful!');
    
    console.log('Testing email configuration...');
    const emailService = require('./utils/emailService');
    console.log('✅ Email service loaded successfully!');
    
    console.log('Testing User model...');
    const User = require('./models/User');
    console.log('✅ User model loaded successfully!');
    
    console.log('\n🎉 All tests passed! Server is ready to run.');
    console.log('\nTo start the server:');
    console.log('npm run dev   (for development)');
    console.log('npm start     (for production)');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
};

testConnection();