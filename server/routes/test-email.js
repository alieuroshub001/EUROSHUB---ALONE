const express = require('express');
const router = express.Router();

// Test which email service is being used
router.get('/email-service-status', async (req, res) => {
  try {
    // Check which email service file is being imported
    const emailServicePath = require.resolve('../utils/emailServiceFrontend');

    res.json({
      success: true,
      message: 'Email service status check',
      emailServiceUsed: 'Frontend API',
      emailServicePath: emailServicePath,
      frontendApiUrl: process.env.FRONTEND_API_URL,
      hasOldEmailCreds: {
        EMAIL_USERNAME: !!process.env.EMAIL_USERNAME,
        EMAIL_PASSWORD: !!process.env.EMAIL_PASSWORD,
        RESEND_API_KEY: !!process.env.RESEND_API_KEY
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Test sending email via frontend API
router.post('/test-frontend-email', async (req, res) => {
  try {
    const emailService = require('../utils/emailServiceFrontend');

    await emailService.sendEmail(
      'ali.rayyan001@gmail.com',
      'Test from Railway Backend via Frontend API',
      '<h1>Success!</h1><p>This email was sent from Railway backend through Vercel frontend API!</p>'
    );

    res.json({
      success: true,
      message: 'Test email sent via frontend API',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      details: error.response?.data || 'No additional details',
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;