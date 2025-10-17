const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const mongoose = require('mongoose');
const cloudinary = require('cloudinary').v2;
const { S3Client, ListObjectsV2Command } = require('@aws-sdk/client-s3');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configure Cloudflare R2
const r2Client = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY
  }
});

// @route   GET /api/storage/mongodb
// @desc    Get MongoDB storage statistics
// @access  Private (superadmin, admin only)
router.get('/mongodb', protect, authorize('superadmin', 'admin'), async (req, res) => {
  try {
    // Get the admin database to list all databases
    const adminDb = mongoose.connection.db.admin();
    const { databases } = await adminDb.listDatabases();

    // Get current database name from connection (the one this project uses)
    const currentDbName = mongoose.connection.db.databaseName;

    // MongoDB Atlas free tier limit is 512MB
    const storageLimit = 512 * 1024 * 1024; // 512 MB in bytes

    // Storage for all databases combined
    let totalDataSize = 0;
    let totalIndexSize = 0;
    let totalStorageSize = 0;
    let totalCollections = 0;
    let totalDocuments = 0;
    const databaseDetails = [];
    const allCollectionDetails = [];
    const currentDbCollectionDetails = []; // Collections only from current database

    // Loop through all databases
    for (const dbInfo of databases) {
      // Skip system databases
      if (dbInfo.name === 'admin' || dbInfo.name === 'local' || dbInfo.name === 'config') {
        continue;
      }

      try {
        const db = mongoose.connection.client.db(dbInfo.name);
        const stats = await db.stats();

        totalDataSize += stats.dataSize || 0;
        totalIndexSize += stats.indexSize || 0;
        totalStorageSize += stats.storageSize || 0;

        // Get collections for this database
        const collections = await db.listCollections().toArray();
        totalCollections += collections.length;

        let dbDocuments = 0;
        const dbCollectionDetails = [];

        // Get stats for each collection
        for (const collection of collections) {
          try {
            const collStats = await db.collection(collection.name).stats();
            const docCount = await db.collection(collection.name).countDocuments();

            dbDocuments += docCount;

            const collDetail = {
              database: dbInfo.name,
              name: collection.name,
              size: collStats.size || 0,
              storageSize: collStats.storageSize || 0,
              indexSize: collStats.totalIndexSize || 0,
              totalSize: (collStats.size || 0) + (collStats.totalIndexSize || 0),
              documentCount: docCount,
              averageDocumentSize: docCount > 0 ? (collStats.size || 0) / docCount : 0,
              indexes: collStats.nindexes || 0
            };

            dbCollectionDetails.push(collDetail);
            allCollectionDetails.push(collDetail);

            // If this is the current database (CRM), add to current db collections
            if (dbInfo.name === currentDbName) {
              currentDbCollectionDetails.push(collDetail);
            }
          } catch (err) {
            console.error(`Error getting stats for collection ${dbInfo.name}.${collection.name}:`, err);
          }
        }

        totalDocuments += dbDocuments;

        databaseDetails.push({
          name: dbInfo.name,
          dataSize: stats.dataSize || 0,
          indexSize: stats.indexSize || 0,
          storageSize: stats.storageSize || 0,
          totalSize: (stats.dataSize || 0) + (stats.indexSize || 0),
          collections: collections.length,
          documents: dbDocuments
        });
      } catch (err) {
        console.error(`Error getting stats for database ${dbInfo.name}:`, err);
      }
    }

    // Sort collections by total size (descending)
    allCollectionDetails.sort((a, b) => b.totalSize - a.totalSize);
    currentDbCollectionDetails.sort((a, b) => b.totalSize - a.totalSize);

    // MongoDB Atlas "Data Size" shows the actual data size without replication multiplier
    const atlasDataSize = totalDataSize + totalIndexSize;
    const usagePercentage = (atlasDataSize / storageLimit) * 100;

    const data = {
      // Overall statistics (using Atlas Data Size calculation - all databases combined)
      totalSize: atlasDataSize,
      dataSize: totalDataSize,
      indexSize: totalIndexSize,
      storageSize: totalStorageSize,
      storageLimit: storageLimit,
      usagePercentage: Math.round(usagePercentage * 100) / 100,

      // Collection statistics (total across all databases)
      collections: totalCollections,
      documents: totalDocuments,
      averageObjectSize: totalDocuments > 0 ? atlasDataSize / totalDocuments : 0,

      // Detailed collection breakdown (only current database collections for display)
      collectionDetails: currentDbCollectionDetails,

      // Database breakdown (all databases)
      databaseDetails: databaseDetails,

      // Database info
      databaseName: currentDbName,
      storageEngine: 'WiredTiger'
    };

    res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    console.error('MongoDB stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch MongoDB statistics',
      error: error.message
    });
  }
});

// @route   GET /api/storage/cloudinary
// @desc    Get Cloudinary storage statistics
// @access  Private (superadmin, admin only)
router.get('/cloudinary', protect, authorize('superadmin', 'admin'), async (req, res) => {
  try {
    // Get usage statistics from Cloudinary
    const usage = await cloudinary.api.usage();

    // Get resources breakdown by type
    const resourceTypes = [];

    try {
      // Get image resources
      const images = await cloudinary.api.resources({ resource_type: 'image', max_results: 500 });
      let imageSize = 0;
      images.resources.forEach(resource => {
        imageSize += resource.bytes || 0;
      });

      resourceTypes.push({
        type: 'Images',
        count: images.resources.length,
        totalCount: images.total_count || images.resources.length,
        size: imageSize
      });

      // Get video resources
      const videos = await cloudinary.api.resources({ resource_type: 'video', max_results: 500 });
      let videoSize = 0;
      videos.resources.forEach(resource => {
        videoSize += resource.bytes || 0;
      });

      resourceTypes.push({
        type: 'Videos',
        count: videos.resources.length,
        totalCount: videos.total_count || videos.resources.length,
        size: videoSize
      });

      // Get raw resources (documents, etc)
      const raw = await cloudinary.api.resources({ resource_type: 'raw', max_results: 500 });
      let rawSize = 0;
      raw.resources.forEach(resource => {
        rawSize += resource.bytes || 0;
      });

      resourceTypes.push({
        type: 'Raw Files',
        count: raw.resources.length,
        totalCount: raw.total_count || raw.resources.length,
        size: rawSize
      });

    } catch (err) {
      console.error('Error fetching Cloudinary resource details:', err.message);
    }

    const data = {
      totalResources: usage.resources || 0,
      usedStorage: usage.storage?.usage || 0,
      maxStorage: usage.storage?.limit || 10737418240, // 10GB default
      bandwidth: usage.bandwidth?.usage || 0,
      bandwidthLimit: usage.bandwidth?.limit || 0,
      transformations: usage.transformations?.usage || 0,
      transformationsLimit: usage.transformations?.limit || 0,
      resourceTypes: resourceTypes,
      plan: usage.plan || 'Free',
      credits: usage.credits || {}
    };

    res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Cloudinary stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch Cloudinary statistics',
      error: error.message
    });
  }
});

// @route   GET /api/storage/cloudflare
// @desc    Get Cloudflare R2 storage statistics
// @access  Private (superadmin, admin only)
router.get('/cloudflare', protect, authorize('superadmin', 'admin'), async (req, res) => {
  try {
    const bucketName = process.env.R2_BUCKET_NAME;

    // List objects in the bucket
    const command = new ListObjectsV2Command({
      Bucket: bucketName
    });

    const response = await r2Client.send(command);

    // Calculate total size and count with breakdown by file type and folder
    let totalSize = 0;
    let objectCount = 0;
    let lastModified = new Date(0);
    const fileTypeBreakdown = {};
    const folderBreakdown = {};

    if (response.Contents) {
      objectCount = response.Contents.length;

      response.Contents.forEach(obj => {
        const size = obj.Size || 0;
        totalSize += size;

        if (obj.LastModified && obj.LastModified > lastModified) {
          lastModified = obj.LastModified;
        }

        // Extract file extension
        const key = obj.Key || '';
        const ext = key.includes('.') ? key.split('.').pop().toLowerCase() : 'no-extension';

        if (!fileTypeBreakdown[ext]) {
          fileTypeBreakdown[ext] = { count: 0, size: 0 };
        }
        fileTypeBreakdown[ext].count++;
        fileTypeBreakdown[ext].size += size;

        // Extract folder (first part of path)
        const folder = key.includes('/') ? key.split('/')[0] : 'root';
        if (!folderBreakdown[folder]) {
          folderBreakdown[folder] = { count: 0, size: 0 };
        }
        folderBreakdown[folder].count++;
        folderBreakdown[folder].size += size;
      });
    }

    // Convert to arrays and sort by size
    const fileTypes = Object.entries(fileTypeBreakdown)
      .map(([type, stats]) => ({
        type: type.toUpperCase(),
        count: stats.count,
        size: stats.size
      }))
      .sort((a, b) => b.size - a.size);

    const folders = Object.entries(folderBreakdown)
      .map(([name, stats]) => ({
        name: name,
        count: stats.count,
        size: stats.size
      }))
      .sort((a, b) => b.size - a.size);

    // Cloudflare R2 free tier limit is 10GB
    const r2StorageLimit = 10 * 1024 * 1024 * 1024; // 10 GB in bytes
    const r2UsagePercentage = (totalSize / r2StorageLimit) * 100;

    const data = {
      bucketSize: totalSize,
      objectCount: objectCount,
      bucketName: bucketName,
      lastModified: lastModified.toISOString(),
      fileTypes: fileTypes,
      folders: folders,
      storageLimit: r2StorageLimit,
      usagePercentage: Math.round(r2UsagePercentage * 100) / 100
    };

    res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Cloudflare R2 stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch Cloudflare R2 statistics',
      error: error.message
    });
  }
});

module.exports = router;
