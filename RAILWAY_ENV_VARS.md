# 🚀 Railway Environment Variables for Email

## 📧 **Email Configuration (Choose One)**

### **Option 1: Resend API (Recommended for Railway)**
```bash
# Primary email service
RESEND_API_KEY=re_your_actual_api_key_here
RESEND_FROM_EMAIL=onboarding@resend.dev

# Alternative with custom domain
# RESEND_FROM_EMAIL=noreply@yourdomain.com
```

### **Option 2: Gmail SMTP (May not work on Railway)**
```bash
EMAIL_SERVICE=gmail
EMAIL_USERNAME=ali.rayyan001@gmail.com
EMAIL_PASSWORD=egjiherhpokyifeq
EMAIL_FROM=ali.rayyan001@gmail.com
SMTP_PORT=2587
```

## 🔧 **Other Required Variables**
```bash
# Database
MONGODB_URI=your_mongodb_connection_string

# JWT
JWT_SECRET=your_super_secret_jwt_key

# Site URLs
NEXT_PUBLIC_SITE_URL=https://euroshub-alone.vercel.app
CLIENT_URL=https://euroshub-alone.vercel.app

# Node Environment
NODE_ENV=production
```

## 📝 **How to Add Variables to Railway**

### **Via Railway Dashboard:**
1. Go to your Railway project
2. Click on your service
3. Go to "Variables" tab
4. Add each variable with name and value
5. Deploy

### **Via Railway CLI:**
```bash
railway login
railway variables set RESEND_API_KEY=re_your_key_here
railway variables set RESEND_FROM_EMAIL=onboarding@resend.dev
```

## 🧪 **Testing Email Setup**

### **Local Testing:**
```bash
cd server
node test-email.js
```

### **Railway Testing:**
1. Add environment variables
2. Deploy your app
3. Check Railway logs for email status
4. Try creating a new user

## ✅ **Resend Setup Steps**

1. **Sign up**: Go to [resend.com](https://resend.com)
2. **Get API Key**: Copy from dashboard
3. **Add to Railway**: Set RESEND_API_KEY variable
4. **Test immediately**: Uses sandbox domain (no setup needed)

### **Sandbox Limitations:**
- 100 emails per day
- Can only send to verified email addresses
- Uses onboarding@resend.dev sender

### **Production Setup:**
- Add your custom domain to Resend
- Configure DNS records
- Update RESEND_FROM_EMAIL to your domain

## 🎯 **Quick Start (5 Minutes)**

1. **Get Resend API key**
2. **Add to Railway:**
   ```
   RESEND_API_KEY=re_your_key
   RESEND_FROM_EMAIL=onboarding@resend.dev
   ```
3. **Add your email in Resend dashboard** (for testing)
4. **Deploy and test!**

Your emails will work immediately with this setup! 🎉