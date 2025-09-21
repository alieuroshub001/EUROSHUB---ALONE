require('dotenv').config();
const emailService = require('./utils/emailService');

async function testEmail() {
  console.log('🧪 Testing email configuration...');

  // Check environment variables
  console.log('📋 Environment Check:');
  console.log('- RESEND_API_KEY:', process.env.RESEND_API_KEY ? '✅ SET' : '❌ NOT SET');
  console.log('- EMAIL_USERNAME:', process.env.EMAIL_USERNAME ? '✅ SET' : '❌ NOT SET');
  console.log('- EMAIL_FROM:', process.env.EMAIL_FROM || 'NOT SET');

  if (!process.env.RESEND_API_KEY && !process.env.EMAIL_USERNAME) {
    console.error('❌ No email service configured!');
    console.log('\n📝 To fix this, add to your Railway environment variables:');
    console.log('RESEND_API_KEY=re_your_api_key_here');
    console.log('RESEND_FROM_EMAIL=onboarding@resend.dev');
    return;
  }

  try {
    // Test email
    const testEmailAddress = process.env.TEST_EMAIL || 'ali.rayyan001@gmail.com';

    console.log(`\n📧 Sending test email to: ${testEmailAddress}`);

    await emailService.sendWelcomeEmail({
      email: testEmailAddress,
      firstName: 'Test',
      lastName: 'User',
      tempPassword: 'Test123!',
      role: 'user',
      verificationToken: 'test-token-123'
    });

    console.log('✅ Email sent successfully!');
    console.log('📊 Check your email and Railway logs for delivery confirmation');

  } catch (error) {
    console.error('❌ Email test failed:', error.message);

    if (error.message.includes('Resend API')) {
      console.log('\n💡 Resend API Tips:');
      console.log('1. Verify your API key is correct');
      console.log('2. Check if your email is added to Resend audience');
      console.log('3. Make sure you\'re using onboarding@resend.dev for sandbox');
    }

    if (error.message.includes('SMTP')) {
      console.log('\n💡 SMTP Tips:');
      console.log('1. Railway may block SMTP ports');
      console.log('2. Consider using Resend API instead');
      console.log('3. Check if Gmail app password is correct');
    }
  }
}

// Run the test
testEmail().then(() => {
  console.log('\n🏁 Email test completed');
  process.exit(0);
}).catch((error) => {
  console.error('💥 Test script error:', error);
  process.exit(1);
});