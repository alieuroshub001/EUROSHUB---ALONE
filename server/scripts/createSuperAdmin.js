const mongoose = require('mongoose');
require('dotenv').config();

const User = require('../models/User');

const createSuperAdmin = async () => {
  try {
    console.log('🔗 Connecting to MongoDB...');
    
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('✅ Connected to MongoDB');

    // Check if super admin already exists
    const existingSuperAdmin = await User.findOne({ role: 'superadmin' });
    
    if (existingSuperAdmin) {
      console.log('⚠️  Super admin already exists:');
      console.log('📧 Email:', existingSuperAdmin.email);
      console.log('👤 Name:', existingSuperAdmin.firstName, existingSuperAdmin.lastName);
      console.log('\n💡 If you want to create a new one, delete the existing super admin first.');
      return;
    }

    // Create super admin user
    const superAdminData = {
      firstName: 'Ali',
      lastName: 'Rayyan',
      email: 'ali.rayyan001@gmail.com',
      password: 'SuperAdmin@2025', // You should change this after first login
      role: 'superadmin',
      phone: '+1234567890',
      department: 'Administration',
      position: 'Super Administrator',
      isActive: true,
      isEmailVerified: true, // Skip email verification for super admin
    };

    console.log('👑 Creating super admin user...');
    
    const superAdmin = await User.create(superAdminData);
    
    console.log('🎉 Super admin created successfully!');
    console.log('📧 Email:', superAdmin.email);
    console.log('🔑 Password: SuperAdmin@2025');
    console.log('👤 Name:', superAdmin.firstName, superAdmin.lastName);
    console.log('🆔 Role:', superAdmin.role);
    console.log('📱 Phone:', superAdmin.phone);
    console.log('🏢 Department:', superAdmin.department);
    console.log('💼 Position:', superAdmin.position);
    console.log('\n⚠️  IMPORTANT: Please change the password after first login!');
    console.log('🌐 Login at: http://localhost:3000 (or your frontend URL)');

  } catch (error) {
    console.error('❌ Error creating super admin:', error.message);
    
    if (error.code === 11000) {
      console.log('📧 A user with this email already exists');
    } else if (error.name === 'ValidationError') {
      console.log('📝 Validation errors:');
      Object.keys(error.errors).forEach(key => {
        console.log(`   - ${key}: ${error.errors[key].message}`);
      });
    }
  } finally {
    // Close database connection
    await mongoose.connection.close();
    console.log('🔒 Database connection closed');
    process.exit(0);
  }
};

// Run the script
console.log('🚀 Starting Super Admin Creation Script...');
console.log('📊 Database:', process.env.MONGODB_URI ? 'Connected' : 'Not configured');
console.log();

createSuperAdmin();