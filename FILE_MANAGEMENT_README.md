# File Management System with Folders - Implementation Guide

## Overview
This implementation adds a comprehensive file management system with folder support to the EUROSHUB project. Users can now organize files in hierarchical folder structures within card's Files tab, upload various file types (PDFs, DOCX, images, etc.), and manage them with proper permissions using Cloudflare R2 storage.

## Features Implemented

### Backend

#### 1. Database Models
- **Folder Model** (`server/models/Folder.js`)
  - Hierarchical folder structure with parent-child relationships
  - Supports nested folders
  - Soft delete functionality
  - Cascade deletion for subfolders and contained files

- **Updated Card Model** (`server/models/Card.js`)
  - Enhanced attachment schema with `folderId` field
  - Added `cloudflareKey` for R2 storage reference
  - Added `isDeleted` flag for soft deletes

#### 2. Cloudflare R2 Configuration
- **Storage Setup** (`server/config/cloudflareR2.js`)
  - S3-compatible API client for Cloudflare R2
  - File upload with automatic key generation
  - Signed URL generation for secure downloads
  - File deletion from cloud storage
  - Support for multiple file types:
    - Images: JPEG, PNG, GIF, WebP, SVG
    - Documents: PDF, Word (.doc, .docx), Excel, PowerPoint
    - Text files: TXT, CSV
    - Archives: ZIP, RAR, 7Z
  - 50MB file size limit per file
  - Multer integration for multipart/form-data handling

#### 3. API Routes

**Folder Routes** (`server/routes/folders.js`):
- `POST /api/cards/:cardId/folders` - Create new folder
- `GET /api/cards/:cardId/folders` - Get folder tree structure
- `GET /api/folders/:folderId` - Get single folder details
- `PUT /api/folders/:folderId` - Rename folder
- `DELETE /api/folders/:folderId` - Delete folder (cascade)
- `GET /api/folders/:folderId/breadcrumb` - Get folder breadcrumb path

**File Routes** (`server/routes/files.js`):
- `POST /api/cards/:cardId/files` - Upload files (with optional folder)
- `GET /api/cards/:cardId/files` - Get files in specific folder
- `GET /api/cards/:cardId/files/all` - Get all files with folder structure
- `GET /api/files/:fileId/download` - Get signed download URL
- `DELETE /api/files/:fileId` - Delete file from storage and database

### Frontend

#### 1. Components

**FolderTree Component** (`euroshub-project/src/components/boards/cards/FolderTree.tsx`):
- Hierarchical folder tree visualization
- Expand/collapse folder navigation
- Context menu for folder/file operations
- Inline folder renaming
- File type icons (PDF, images, archives, etc.)
- File size formatting

**Updated ProjectModal** (`euroshub-project/src/components/boards/cards/ProjectModal.tsx`):
- Integrated folder tree in Files tab
- Split-view layout (folder sidebar + file content)
- Create folder functionality
- File upload to current folder
- Download and delete operations
- Permission-based UI controls

#### 2. Services

**File API Service** (`euroshub-project/src/services/filesApi.ts`):
- Folder CRUD operations
- File upload with FormData
- Download URL retrieval
- File deletion
- TypeScript type safety

## Installation & Setup

### 1. Install Dependencies

```bash
cd server
npm install
```

The following packages will be installed:
- `@aws-sdk/client-s3` - S3-compatible client for Cloudflare R2
- `@aws-sdk/s3-request-presigner` - For generating signed download URLs

### 2. Configure Environment Variables

Add the following to your `server/.env` file:

```env
# Cloudflare R2 Storage Configuration
CLOUDFLARE_R2_ENDPOINT=https://your-account-id.r2.cloudflarestorage.com
CLOUDFLARE_R2_ACCESS_KEY_ID=your_r2_access_key_id
CLOUDFLARE_R2_SECRET_ACCESS_KEY=your_r2_secret_access_key
CLOUDFLARE_R2_BUCKET_NAME=euroshub-files
CLOUDFLARE_R2_PUBLIC_URL=https://your-custom-domain.com  # Optional
```

### 3. Create Cloudflare R2 Bucket

1. Log in to Cloudflare Dashboard
2. Navigate to R2 Storage
3. Create a new bucket named `euroshub-files` (or your preferred name)
4. Generate R2 API tokens:
   - Go to R2 → Manage R2 API Tokens
   - Create API token with read & write permissions
   - Copy the Access Key ID and Secret Access Key

### 4. Configure Bucket Permissions

For public URL access (optional):
1. Go to your R2 bucket settings
2. Enable "Public URL Access" or connect a custom domain
3. Add the public URL to `CLOUDFLARE_R2_PUBLIC_URL` in .env

For private buckets (recommended):
- Files will be accessed via signed URLs
- No need to set `CLOUDFLARE_R2_PUBLIC_URL`

### 5. Start the Server

```bash
cd server
npm run dev
```

### 6. Start the Frontend

```bash
cd euroshub-project
npm run dev
```

## Usage

### Creating Folders

1. Open a card in the Trello board
2. Navigate to the "Files" tab
3. Click the folder icon (+) in the sidebar
4. Enter folder name and press "Create"
5. Folders can be nested by creating subfolders

### Uploading Files

1. Navigate to desired folder (or root level)
2. Click "Upload Files" button
3. Select one or multiple files
4. Files are uploaded to Cloudflare R2 and associated with the card

### Managing Files

**Download:**
- Click the "Download" button on any file
- Files are downloaded via signed URLs (secure)

**Delete:**
- Click the delete icon (trash)
- Files are removed from R2 storage and database
- Permission-based: creators, managers, or file uploaders can delete

**Organize:**
- Right-click folders to rename or delete
- Right-click files for quick actions
- Drag functionality can be added in future updates

## Permissions

The file system respects card membership roles:

| Role | Create Folder | Upload Files | Delete Own Files | Delete Any File |
|------|--------------|--------------|------------------|-----------------|
| **Board/Project Creator** | ✅ | ✅ | ✅ | ✅ |
| **Project Manager** | ✅ | ✅ | ✅ | ✅ |
| **Team Lead** | ✅ | ✅ | ✅ | ✅ |
| **Contributor** | ✅ | ✅ | ✅ | ❌ |
| **Commenter** | ❌ | ❌ | ❌ | ❌ |
| **Viewer** | ❌ | ❌ | ❌ | ❌ |

## File Types Supported

- **Images**: JPEG, PNG, GIF, WebP, SVG
- **Documents**: PDF, Word (.doc, .docx)
- **Spreadsheets**: Excel (.xls, .xlsx)
- **Presentations**: PowerPoint (.ppt, .pptx)
- **Text**: TXT, CSV
- **Archives**: ZIP, RAR, 7Z

## Storage Architecture

### File Storage Flow

1. **Upload**:
   ```
   Client → Backend API → Multer (memory) → Cloudflare R2 → Database metadata
   ```

2. **Download**:
   ```
   Client → Backend API → Generate signed URL → Client downloads from R2
   ```

3. **Delete**:
   ```
   Client → Backend API → Delete from R2 → Soft delete in database
   ```

### File Keys in R2

Files are stored with the following key structure:
```
cards/{cardId}/{folderId}/{timestamp}_{sanitized_filename}
```

Example:
```
cards/65a1b2c3d4e5f6g7h8i9j0k1/65x1y2z3a4b5c6d7e8f9g0h1/1710123456789_project_proposal.pdf
```

## Database Schema

### Folder Schema
```javascript
{
  name: String,
  cardId: ObjectId (ref: Card),
  parentFolder: ObjectId (ref: Folder) | null,
  createdBy: ObjectId (ref: User),
  isDeleted: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

### Updated Attachment Schema (in Card)
```javascript
{
  filename: String,
  originalName: String,
  mimetype: String,
  size: Number,
  url: String,
  cloudflareKey: String,
  folderId: ObjectId (ref: Folder) | null,
  uploadedBy: ObjectId (ref: User),
  isDeleted: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

## Security Considerations

1. **File Uploads**:
   - Validated file types (mimetype checking)
   - Size limits enforced (50MB per file)
   - Authentication required for all upload operations

2. **File Access**:
   - Permission checks on every request
   - Signed URLs with expiration (1 hour default)
   - Files associated with cards, inherit card permissions

3. **File Deletion**:
   - Soft delete in database (preserves audit trail)
   - Hard delete from R2 storage
   - Permission validation before deletion

4. **Folder Operations**:
   - Cascade deletion for subfolders and files
   - Duplicate name prevention in same location
   - Access control based on card permissions

## Future Enhancements

1. **Drag-and-Drop**:
   - Move files between folders
   - Reorder folders in tree

2. **File Preview**:
   - In-browser PDF viewer
   - Image preview modal
   - Document preview for Office files

3. **Batch Operations**:
   - Multi-select files
   - Bulk download (ZIP)
   - Bulk delete

4. **Search**:
   - Search files by name
   - Filter by file type
   - Search within folder

5. **Version Control**:
   - File versioning
   - Version history
   - Restore previous versions

6. **Sharing**:
   - Generate public share links
   - External file sharing
   - Link expiration

## Troubleshooting

### Files not uploading
1. Check Cloudflare R2 credentials in `.env`
2. Verify bucket name is correct
3. Check network connectivity to Cloudflare
4. Review file size limits (50MB max)

### Downloads failing
1. Ensure signed URL generation is working
2. Check R2 bucket permissions
3. Verify CORS settings if accessing from different domain

### Folder operations not working
1. Check user permissions on the card
2. Verify database connection
3. Review console logs for errors

## Support

For issues or questions:
1. Check console logs (browser and server)
2. Review API responses in Network tab
3. Verify environment variables are set correctly
4. Ensure all dependencies are installed

## Credits

Implementation by: Claude (Anthropic)
Project: EUROSHUB - Project Management System
Date: 2025-10-01
