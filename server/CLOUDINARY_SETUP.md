# Cloudinary Setup Instructions

## Overview
This project uses Cloudinary for file and image storage in the task management system. Follow these steps to configure Cloudinary for your project.

## Step 1: Create a Cloudinary Account
1. Go to [https://cloudinary.com/](https://cloudinary.com/)
2. Sign up for a free account or log in if you already have one
3. Navigate to your Dashboard

## Step 2: Get Your Credentials
From your Cloudinary Dashboard, copy the following values:
- **Cloud Name**: Your unique cloud name
- **API Key**: Your API key
- **API Secret**: Your API secret (keep this secure!)

## Step 3: Update Environment Variables
In your server `.env` file, replace the placeholder values:

```env
# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your_actual_cloud_name
CLOUDINARY_API_KEY=your_actual_api_key
CLOUDINARY_API_SECRET=your_actual_api_secret
```

## Step 4: Folder Structure
The application is configured to organize uploads in the following folder structure:
- `/euroshub/attachments/` - General file attachments
- `/euroshub/images/` - Optimized images

## Step 5: Features Enabled
With Cloudinary configured, users can:

### Task Attachments
- Upload any file type (PDF, DOC, XLSX, ZIP, etc.) up to 10MB
- Upload images with automatic optimization
- Upload multiple files at once
- Delete attachments they uploaded
- Download/view attachments

### Image Optimization
- Automatic format conversion (WebP when supported)
- Smart compression with quality: auto
- Responsive image sizing
- Thumbnail generation

### Supported File Types
**General Files:** PDF, DOC, DOCX, TXT, CSV, XLSX, ZIP, RAR
**Images:** JPG, JPEG, PNG, GIF, WebP

## Step 6: Testing
1. Restart your server after updating the environment variables
2. Create or edit a task in the project management module
3. Go to the "Attachments" tab
4. Test uploading files and images
5. Verify files appear in your Cloudinary Media Library

## Security Notes
- API Secret should never be exposed in frontend code
- File uploads are restricted by:
  - File size limits (10MB for files, 5MB for images)
  - File type validation
  - User authentication and permissions
  - Project access controls

## Troubleshooting
- **Upload fails**: Check environment variables are correctly set
- **Large files fail**: Verify file size is under limits
- **Images not optimizing**: Check Cloudinary transformation settings
- **Access denied**: Verify user has write permissions on the project

## Cost Considerations
Cloudinary free tier includes:
- 25 GB storage
- 25 GB monthly bandwidth
- 1000 transformations per month

Monitor usage in your Cloudinary dashboard and upgrade if needed.