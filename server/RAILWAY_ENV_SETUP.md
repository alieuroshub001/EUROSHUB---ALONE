# Railway Environment Variables Setup

## 🚨 CRITICAL: Set these environment variables in Railway Dashboard

### Required Variables (Must Set):

```bash
# Production Environment
NODE_ENV=production

# Database
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database?retryWrites=true&w=majority

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-at-least-32-characters-long
JWT_EXPIRES_IN=7d
JWT_COOKIE_EXPIRE=7

# CORS and Frontend URLs
CLIENT_URL=https://euroshub-alone.vercel.app
FRONTEND_URL=https://euroshub-alone.vercel.app
CORS_ORIGIN=https://euroshub-alone.vercel.app
NEXT_PUBLIC_SITE_URL=https://euroshub-alone.vercel.app
```

### Optional but Recommended:

```bash
# Email Configuration (for automation features)
EMAIL_SERVICE=gmail
EMAIL_USERNAME=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
EMAIL_FROM=your-email@gmail.com

# Cloudinary (for file uploads)
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

## 🔧 How to Set Variables:

1. Go to Railway Dashboard
2. Select your project
3. Go to "Variables" tab
4. Add each variable one by one
5. Deploy after setting variables

## ✅ Verification:

After deployment, check:
- Health endpoint: `https://your-app.railway.app/health`
- API endpoint: `https://your-app.railway.app/api/health`
- CORS test from Vercel app

## 🚨 Common Issues:

- Make sure `MONGODB_URI` allows connections from Railway (0.0.0.0/0)
- Ensure `JWT_SECRET` is at least 32 characters
- Verify `CLIENT_URL` matches your exact Vercel domain
- Check that all URLs include the protocol (https://)