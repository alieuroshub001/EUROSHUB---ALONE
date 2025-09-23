// Test script for email functionality
const axios = require('axios');

const FRONTEND_API_URL = 'http://localhost:3000/api/emails';

async function testEmailAPI() {
  console.log('📧 Testing Frontend Email API...\n');

  // Test 1: Welcome Email
  try {
    console.log('🔄 Testing Welcome Email...');
    const welcomeResponse = await axios.post(`${FRONTEND_API_URL}/welcome`, {
      email: 'test@example.com',
      firstName: 'John',
      lastName: 'Doe',
      tempPassword: 'temp123',
      role: 'employee',
      verificationToken: 'test-token-123'
    });
    console.log('✅ Welcome Email:', welcomeResponse.data.message);
  } catch (error) {
    console.error('❌ Welcome Email Error:', error.response?.data || error.message);
  }

  console.log('');

  // Test 2: Password Reset Email
  try {
    console.log('🔄 Testing Password Reset Email...');
    const resetResponse = await axios.post(`${FRONTEND_API_URL}/password-reset`, {
      email: 'test@example.com',
      firstName: 'John',
      resetToken: 'reset-token-123'
    });
    console.log('✅ Password Reset Email:', resetResponse.data.message);
  } catch (error) {
    console.error('❌ Password Reset Email Error:', error.response?.data || error.message);
  }

  console.log('');

  // Test 3: Generic Send Email
  try {
    console.log('🔄 Testing Generic Send Email...');
    const sendResponse = await axios.post(`${FRONTEND_API_URL}/send`, {
      to: 'test@example.com',
      subject: 'Test Email from Frontend API',
      html: '<h1>Hello World!</h1><p>This is a test email from the frontend API.</p>'
    });
    console.log('✅ Generic Send Email:', sendResponse.data.message);
  } catch (error) {
    console.error('❌ Generic Send Email Error:', error.response?.data || error.message);
  }

  console.log('');

  // Test 4: Project Member Email
  try {
    console.log('🔄 Testing Project Member Email...');
    const projectResponse = await axios.post(`${FRONTEND_API_URL}/project-member`, {
      memberEmail: 'test@example.com',
      memberName: 'John Doe',
      projectTitle: 'Test Project',
      projectDescription: 'A test project for email functionality',
      inviterName: 'Jane Smith',
      role: 'developer'
    });
    console.log('✅ Project Member Email:', projectResponse.data.message);
  } catch (error) {
    console.error('❌ Project Member Email Error:', error.response?.data || error.message);
  }

  console.log('');

  // Test 5: Task Assignment Email
  try {
    console.log('🔄 Testing Task Assignment Email...');
    const taskResponse = await axios.post(`${FRONTEND_API_URL}/task-assignment`, {
      assigneeEmail: 'test@example.com',
      assigneeName: 'John Doe',
      taskTitle: 'Test Task',
      taskDescription: 'A test task for email functionality',
      projectTitle: 'Test Project',
      assignerName: 'Jane Smith',
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
    });
    console.log('✅ Task Assignment Email:', taskResponse.data.message);
  } catch (error) {
    console.error('❌ Task Assignment Email Error:', error.response?.data || error.message);
  }

  console.log('\n📧 Email API Testing Complete!');
}

// Run the test
testEmailAPI().catch(console.error);