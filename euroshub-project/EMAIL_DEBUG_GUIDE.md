# Email Service Debugging Guide

## 🔍 Steps to Debug Email Issues on Vercel

### 1. Test the Email Configuration
Visit your Vercel app and navigate to:
```
https://your-app.vercel.app/api/test-email
```

This will show if your environment variables are set correctly.

### 2. Send a Test Email
Make a POST request to:
```
https://your-app.vercel.app/api/test-email
```

With body (optional):
```json
{
  "testEmail": "your-email@example.com"
}
```

### 3. Check Vercel Logs
1. Go to your Vercel dashboard
2. Select your project
3. Go to "Functions" tab
4. Look at the logs for any errors

### 4. Common Issues & Solutions

#### Issue: "Authentication failed"
**Solution:**
- Make sure you're using Gmail App Password, not your regular password
- Generate new App Password: Gmail Settings → Security → 2-Step Verification → App passwords

#### Issue: "Environment variables not set"
**Solution:**
- Check Vercel dashboard → Project Settings → Environment Variables
- Make sure these are set:
  - `EMAIL_USERNAME=ali.rayyan001@gmail.com`
  - `EMAIL_PASSWORD=egjiherhpokyifeq`
  - `EMAIL_FROM=ali.rayyan001@gmail.com`

#### Issue: "Network error"
**Solution:**
- Check if Gmail SMTP is accessible from Vercel
- Try using port 587 explicitly

### 5. Test Individual Email Routes

#### Welcome Email:
```bash
curl -X POST https://your-app.vercel.app/api/emails/welcome \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "tempPassword": "temp123",
    "role": "employee",
    "verificationToken": "test-token"
  }'
```

#### Password Reset Email:
```bash
curl -X POST https://your-app.vercel.app/api/emails/password-reset \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "firstName": "John",
    "resetToken": "reset-token-123"
  }'
```

### 6. Backend Configuration

Make sure your Railway backend has:
```
FRONTEND_API_URL=https://your-app.vercel.app/api/emails
```

### 7. Gmail Settings Checklist

1. ✅ 2-Factor Authentication enabled
2. ✅ App Password generated (not regular password)
3. ✅ "Less secure app access" is NOT needed (we're using App Password)
4. ✅ IMAP/POP access enabled in Gmail settings

### 8. Expected Response

**Success:**
```json
{
  "success": true,
  "message": "Email sent successfully to test@example.com",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

**Error:**
```json
{
  "error": "Failed to send email",
  "details": "Authentication failed",
  "code": "EAUTH",
  "envCheck": {
    "EMAIL_USERNAME": "SET",
    "EMAIL_PASSWORD": "SET"
  }
}
```

## 🚨 If Still Not Working

1. Check Vercel function logs
2. Verify App Password is correct
3. Try regenerating Gmail App Password
4. Test locally first with same environment variables
5. Check if Gmail is blocking the requests