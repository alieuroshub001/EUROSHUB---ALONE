# 🚀 EuroHub User Management System Setup Guide

## Overview
Your user management system has been successfully configured to work with your separate server folder and real database integration. The system includes role-based permissions, email notifications, and a modern UI.

## 📁 Architecture
- **Frontend**: Next.js app (`/euroshub-project/`) - Handles UI and user interactions
- **Backend**: Express server (`/server/`) - Handles API endpoints, database operations, and email services

## 🔧 Setup Instructions

### 1. Server Setup

#### Environment Variables
Make sure your server `.env` file includes these variables:

```bash
# Database
MONGODB_URI=your_mongodb_connection_string

# JWT
JWT_SECRET=your_super_secret_jwt_key
JWT_EXPIRES_IN=7d
JWT_COOKIE_EXPIRE=7

# Email Configuration
EMAIL_SERVICE=gmail
EMAIL_USERNAME=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
EMAIL_FROM="EuroHub <noreply@eurohub.com>"

# Site URL
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Server Port
PORT=5000
```

#### Install Dependencies & Start Server
```bash
cd server
npm install
npm run dev
```

### 2. Frontend Setup

#### Environment Variables
Create/update your frontend `.env.local` file:

```bash
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

#### Install Dependencies & Start Frontend
```bash
cd euroshub-project
npm install
npm run dev
```

## 🗄️ Database Schema

The User model includes all necessary fields for user management:
- Personal info: `firstName`, `lastName`, `email`, `phone`
- Work info: `department`, `position`
- Security: `password`, `role`, `isActive`, `isEmailVerified`
- Tracking: `lastLogin`, `createdBy`, `loginAttempts`

## 🔐 Role-Based Permissions

### Superadmin
- Can create and manage all user roles
- Full access to user management system
- Can delete any user (except self)

### Admin
- Can create: HR, Employee, Client users
- Cannot create: Superadmin or other Admin users
- Can edit/delete non-superadmin users

### HR
- Can create: Employee users only
- Can edit: Employee users only
- Cannot delete any users

### Employee/Client
- No user management access

## 📧 Email System

### Automatic Features
- **Welcome emails** with temporary passwords sent to new users
- **Professional HTML templates** with company branding
- **Email verification** links for account activation
- **Password reset** functionality

### Configuration
The system uses your existing email service configuration. Make sure to:
1. Enable "Less secure app access" (Gmail) or use App Passwords
2. Configure the correct SMTP settings in your server `.env`

## 🌐 API Endpoints

### User Management Routes (`/api/user-management/`)

#### GET `/users`
- Fetch users based on current user's permissions
- Supports filtering by role, status, and search
- Protected: Admin, HR, Superadmin

#### POST `/users`
- Create new user with role-based validation
- Sends welcome email with credentials
- Protected: Admin, HR, Superadmin

#### PUT `/users`
- Update existing user information
- Role changes restricted to Superadmin
- Protected: Admin, HR, Superadmin

#### DELETE `/users`
- Delete user (except self)
- HR users cannot delete anyone
- Protected: Admin, Superadmin

#### GET `/stats`
- Get user statistics dashboard
- Role-filtered based on permissions
- Protected: Admin, HR, Superadmin

## 🎨 Frontend Features

### User Management Dashboard
- **Statistics cards**: Total users, Active users, Pending verification, Admins
- **Advanced filtering**: By role, status, and search terms
- **Modern UI**: Responsive design with Tailwind CSS

### User Operations
- **Create User Modal**: Form validation and role-based dropdown
- **Edit User Modal**: Update user info with permission checks
- **Delete User Modal**: Confirmation with typed verification

### Access Control
- Navigation menu automatically shows/hides based on user role
- Permission checks at component level
- Role-based UI element visibility

## 🧪 Testing the System

### 1. Start Both Servers
```bash
# Terminal 1 - Backend
cd server
npm run dev

# Terminal 2 - Frontend
cd euroshub-project
npm run dev
```

### 2. Access User Management
- **Superadmin**: `http://localhost:3000/superadmin/user-management`
- **Admin**: `http://localhost:3000/admin/user-management`
- **HR**: `http://localhost:3000/hr/user-management`

### 3. Test Features
1. **Create a new user** - Check email delivery
2. **Edit user information** - Verify permission restrictions
3. **Filter/search users** - Test different criteria
4. **Role-based access** - Try accessing with different user types

## 🔍 Troubleshooting

### Common Issues

#### 1. CORS Errors
Make sure your server CORS configuration allows your frontend domain:
```javascript
origin: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
```

#### 2. Authentication Issues
- Check JWT token is being sent in requests
- Verify auth middleware is working correctly
- Ensure cookies are enabled for authentication

#### 3. Email Not Sending
- Verify email credentials in server `.env`
- Check email service (Gmail) allows app passwords
- Review server logs for email errors

#### 4. Permission Denied
- Confirm user has correct role for the operation
- Check if user is active and email verified
- Verify role hierarchy in User model

## 📝 Next Steps

### Recommended Enhancements
1. **Add bulk operations** (bulk delete, bulk role assignment)
2. **User import/export** functionality
3. **Advanced reporting** and analytics
4. **User activity logging** and audit trails
5. **Profile picture upload** functionality

### Database Integration
The system is ready for your database. Simply:
1. Ensure MongoDB is connected via the existing `connectDB()` function
2. All user operations will automatically use the database
3. Email notifications work out of the box

## ✅ Verification Checklist

- [ ] Server starts without errors on port 5000
- [ ] Frontend starts without errors on port 3000
- [ ] User management pages load correctly for each role
- [ ] API endpoints respond correctly
- [ ] Email service is configured and working
- [ ] Database connection is established
- [ ] Role-based permissions work as expected

Your user management system is now fully integrated with your server and ready for production use! 🎉