'use client';

import React, { useState, useEffect } from 'react';
import { Database, HardDrive, Cloud, Server, AlertCircle, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';


interface CollectionDetail {
  database: string;
  name: string;
  size: number;
  storageSize: number;
  indexSize: number;
  totalSize: number;
  documentCount: number;
  averageDocumentSize: number;
  indexes: number;
}

interface DatabaseDetail {
  name: string;
  dataSize: number;
  indexSize: number;
  storageSize: number;
  totalSize: number;
  collections: number;
  documents: number;
}

interface MongoDBStats {
  totalSize: number;
  dataSize: number;
  indexSize: number;
  storageSize: number;
  storageLimit: number;
  usagePercentage: number;
  collections: number;
  documents: number;
  averageObjectSize: number;
  collectionDetails: CollectionDetail[];
  databaseDetails: DatabaseDetail[];
  databaseName: string;
  storageEngine: string;
}

interface ResourceType {
  type: string;
  count: number;
  totalCount: number;
  size: number;
}

interface CloudinaryStats {
  totalResources: number;
  usedStorage: number;
  bandwidth: number;
  bandwidthLimit: number;
  maxStorage: number;
  transformations: number;
  transformationsLimit: number;
  resourceTypes: ResourceType[];
  plan: string;
  credits: Record<string, unknown>;
}

interface FileType {
  type: string;
  count: number;
  size: number;
}

interface Folder {
  name: string;
  count: number;
  size: number;
}

interface CloudflareR2Stats {
  bucketSize: number;
  objectCount: number;
  bucketName: string;
  lastModified: string;
  fileTypes: FileType[];
  folders: Folder[];
  storageLimit: number;
  usagePercentage: number;
}

export default function StorageManagement() {
  const [activeTab, setActiveTab] = useState<'mongodb' | 'cloudinary' | 'cloudflare'>('mongodb');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [mongoStats, setMongoStats] = useState<MongoDBStats | null>(null);
  const [cloudinaryStats, setCloudinaryStats] = useState<CloudinaryStats | null>(null);
  const [cloudflareStats, setCloudflareStats] = useState<CloudflareR2Stats | null>(null);

  const loadStorageData = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api';
      const response = await fetch(`${API_BASE}/storage/${activeTab}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch storage data');
      }

      const data = await response.json();

      if (activeTab === 'mongodb') {
        setMongoStats(data.data);
      } else if (activeTab === 'cloudinary') {
        setCloudinaryStats(data.data);
      } else if (activeTab === 'cloudflare') {
        setCloudflareStats(data.data);
      }
    } catch (err: unknown) {
      const error = err as { message: string };
      setError(error.message);
      toast.error('Failed to load storage data');
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    loadStorageData();
  }, [loadStorageData]);

  const formatBytes = (bytes: number, decimals = 2): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  const formatNumber = (num: number): string => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  const calculatePercentage = (used: number, total: number): number => {
    if (total === 0) return 0;
    return Math.round((used / total) * 100);
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-2 border-gray-200 border-t-[#17b6b2] rounded-full animate-spin mx-auto"></div>
          <p className="text-gray-500 dark:text-gray-400">Loading storage data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center space-y-4 max-w-md">
          <div className="w-16 h-16 rounded-lg flex items-center justify-center mx-auto border border-gray-200 dark:border-gray-700">
            <AlertCircle className="w-8 h-8 text-[#17b6b2]" strokeWidth={1.5} />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Failed to load storage data</h3>
          <p className="text-gray-500 dark:text-gray-400">{error}</p>
          <button
            onClick={loadStorageData}
            className="px-6 py-2 bg-[#17b6b2] text-white rounded-lg hover:bg-[#15a09d] transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900 dark:text-white mb-1 flex items-center gap-3">
            <HardDrive className="w-8 h-8 text-[#17b6b2]" strokeWidth={1.5} />
            Storage Analytics
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            {activeTab === 'mongodb'
              ? 'MongoDB database storage usage and statistics'
              : activeTab === 'cloudinary'
              ? 'Cloudinary media storage and bandwidth usage'
              : 'Cloudflare R2 object storage statistics'
            }
          </p>
        </div>
        <button
          onClick={loadStorageData}
          className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#17b6b2] text-white font-medium rounded-lg hover:bg-[#15a09d] transition-colors"
        >
          Refresh Data
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-1">
        <nav className="flex gap-1">
          <button
            onClick={() => setActiveTab('mongodb')}
            className={`flex-1 sm:flex-none px-6 py-2.5 rounded-md font-medium text-sm transition-colors flex items-center justify-center gap-2 ${
              activeTab === 'mongodb'
                ? 'bg-[#17b6b2] text-white'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}
          >
            <Database className="w-5 h-5" strokeWidth={1.5} />
            <span className="hidden sm:inline">MongoDB</span>
            <span className="sm:hidden">Mongo</span>
          </button>

          <button
            onClick={() => setActiveTab('cloudinary')}
            className={`flex-1 sm:flex-none px-6 py-2.5 rounded-md font-medium text-sm transition-colors flex items-center justify-center gap-2 ${
              activeTab === 'cloudinary'
                ? 'bg-[#17b6b2] text-white'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}
          >
            <Cloud className="w-5 h-5" strokeWidth={1.5} />
            <span className="hidden sm:inline">Cloudinary</span>
            <span className="sm:hidden">Cloud</span>
          </button>

          <button
            onClick={() => setActiveTab('cloudflare')}
            className={`flex-1 sm:flex-none px-6 py-2.5 rounded-md font-medium text-sm transition-colors flex items-center justify-center gap-2 ${
              activeTab === 'cloudflare'
                ? 'bg-[#17b6b2] text-white'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}
          >
            <Server className="w-5 h-5" strokeWidth={1.5} />
            <span className="hidden sm:inline">Cloudflare R2</span>
            <span className="sm:hidden">R2</span>
          </button>
        </nav>
      </div>

      {/* MongoDB Stats */}
      {activeTab === 'mongodb' && mongoStats && (
        <div className="space-y-4">
          {/* Storage Usage Overview - Atlas Style */}
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Data Size</h2>
              <span className="text-sm text-gray-500 dark:text-gray-400">Overall Storage</span>
            </div>
            <div className="mb-4">
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-3xl font-bold text-gray-900 dark:text-white">{formatBytes(mongoStats.totalSize)}</span>
                <span className="text-lg text-gray-500 dark:text-gray-400">/ {formatBytes(mongoStats.storageLimit)}</span>
                <span className="ml-2 px-2 py-1 bg-[#17b6b2]/10 text-[#17b6b2] rounded text-sm font-medium">
                  {mongoStats.usagePercentage.toFixed(2)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                <div
                  className={`h-3 rounded-full transition-all duration-500 ${
                    mongoStats.usagePercentage > 80 ? 'bg-red-500' :
                    mongoStats.usagePercentage > 60 ? 'bg-yellow-500' :
                    'bg-[#17b6b2]'
                  }`}
                  style={{ width: `${Math.min(mongoStats.usagePercentage, 100)}%` }}
                ></div>
              </div>
              <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                <span>Used: {formatBytes(mongoStats.totalSize)}</span>
                <span>Remaining: {formatBytes(mongoStats.storageLimit - mongoStats.totalSize)}</span>
              </div>
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Database: <span className="font-semibold text-gray-900 dark:text-white">{mongoStats.databaseName}</span>
            </div>
          </div>

          {/* Quick Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center border border-gray-200 dark:border-gray-700">
                  <HardDrive className="w-5 h-5 text-[#17b6b2]" strokeWidth={1.5} />
                </div>
                <div className="text-right">
                  <p className="text-2xl font-semibold text-gray-900 dark:text-white">{formatBytes(mongoStats.dataSize)}</p>
                </div>
              </div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Data Size</p>
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center border border-gray-200 dark:border-gray-700">
                  <CheckCircle className="w-5 h-5 text-[#17b6b2]" strokeWidth={1.5} />
                </div>
                <div className="text-right">
                  <p className="text-2xl font-semibold text-gray-900 dark:text-white">{formatBytes(mongoStats.indexSize)}</p>
                </div>
              </div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Index Size</p>
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center border border-gray-200 dark:border-gray-700">
                  <Database className="w-5 h-5 text-[#17b6b2]" strokeWidth={1.5} />
                </div>
                <div className="text-right">
                  <p className="text-2xl font-semibold text-gray-900 dark:text-white">{formatNumber(mongoStats.collections)}</p>
                </div>
              </div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Collections</p>
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center border border-gray-200 dark:border-gray-700">
                  <AlertCircle className="w-5 h-5 text-[#17b6b2]" strokeWidth={1.5} />
                </div>
                <div className="text-right">
                  <p className="text-2xl font-semibold text-gray-900 dark:text-white">{formatNumber(mongoStats.documents)}</p>
                </div>
              </div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Documents</p>
            </div>
          </div>

          {/* Database Breakdown */}
          {mongoStats.databaseDetails && mongoStats.databaseDetails.length > 0 && (
            <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Database Breakdown</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {mongoStats.databaseDetails.map((db, index) => (
                  <div key={index} className="border border-gray-200 dark:border-gray-800 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-3">{db.name}</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Total Size:</span>
                        <span className="font-semibold text-gray-900 dark:text-white">{formatBytes(db.totalSize)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Collections:</span>
                        <span className="font-medium text-gray-900 dark:text-white">{db.collections}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Documents:</span>
                        <span className="font-medium text-gray-900 dark:text-white">{formatNumber(db.documents)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Collections Breakdown */}
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Collections in {mongoStats.databaseName} Database
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Showing collections for the current project database
            </p>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-800">
                    <th className="text-left py-3 px-2 text-sm font-semibold text-gray-600 dark:text-gray-400">Collection</th>
                    <th className="text-right py-3 px-2 text-sm font-semibold text-gray-600 dark:text-gray-400">Documents</th>
                    <th className="text-right py-3 px-2 text-sm font-semibold text-gray-600 dark:text-gray-400">Data Size</th>
                    <th className="text-right py-3 px-2 text-sm font-semibold text-gray-600 dark:text-gray-400">Index Size</th>
                    <th className="text-right py-3 px-2 text-sm font-semibold text-gray-600 dark:text-gray-400">Total Size</th>
                  </tr>
                </thead>
                <tbody>
                  {mongoStats.collectionDetails.map((collection, index) => (
                    <tr key={index} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="py-3 px-2 text-sm font-medium text-gray-900 dark:text-white">{collection.name}</td>
                      <td className="py-3 px-2 text-sm text-right text-gray-600 dark:text-gray-400">{formatNumber(collection.documentCount)}</td>
                      <td className="py-3 px-2 text-sm text-right text-gray-600 dark:text-gray-400">{formatBytes(collection.size)}</td>
                      <td className="py-3 px-2 text-sm text-right text-gray-600 dark:text-gray-400">{formatBytes(collection.indexSize)}</td>
                      <td className="py-3 px-2 text-sm text-right font-semibold text-gray-900 dark:text-white">{formatBytes(collection.totalSize)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Database Info */}
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Database Information</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-800">
                <span className="text-gray-600 dark:text-gray-400">Database Name</span>
                <span className="font-semibold text-gray-900 dark:text-white">{mongoStats.databaseName}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-800">
                <span className="text-gray-600 dark:text-gray-400">Storage Engine</span>
                <span className="font-semibold text-gray-900 dark:text-white">{mongoStats.storageEngine}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-800">
                <span className="text-gray-600 dark:text-gray-400">Average Object Size</span>
                <span className="font-semibold text-gray-900 dark:text-white">{formatBytes(mongoStats.averageObjectSize)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-800">
                <span className="text-gray-600 dark:text-gray-400">Storage Size</span>
                <span className="font-semibold text-gray-900 dark:text-white">{formatBytes(mongoStats.storageSize)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cloudinary Stats */}
      {activeTab === 'cloudinary' && cloudinaryStats && (
        <div className="space-y-4">
          {/* Overview Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center border border-gray-200 dark:border-gray-700">
                  <Cloud className="w-5 h-5 text-[#17b6b2]" strokeWidth={1.5} />
                </div>
                <div className="text-right">
                  <p className="text-2xl font-semibold text-gray-900 dark:text-white">{formatBytes(cloudinaryStats.usedStorage)}</p>
                </div>
              </div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Used Storage</p>
              <div className="mt-2">
                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                  <span>{calculatePercentage(cloudinaryStats.usedStorage, cloudinaryStats.maxStorage)}%</span>
                  <span>{formatBytes(cloudinaryStats.maxStorage)}</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-[#17b6b2] h-2 rounded-full"
                    style={{ width: `${calculatePercentage(cloudinaryStats.usedStorage, cloudinaryStats.maxStorage)}%` }}
                  ></div>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center border border-gray-200 dark:border-gray-700">
                  <HardDrive className="w-5 h-5 text-[#17b6b2]" strokeWidth={1.5} />
                </div>
                <div className="text-right">
                  <p className="text-2xl font-semibold text-gray-900 dark:text-white">{formatNumber(cloudinaryStats.totalResources)}</p>
                </div>
              </div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Resources</p>
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center border border-gray-200 dark:border-gray-700">
                  <CheckCircle className="w-5 h-5 text-[#17b6b2]" strokeWidth={1.5} />
                </div>
                <div className="text-right">
                  <p className="text-2xl font-semibold text-gray-900 dark:text-white">{formatBytes(cloudinaryStats.bandwidth)}</p>
                </div>
              </div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Bandwidth Used</p>
            </div>
          </div>

          {/* Resource Type Breakdown */}
          {cloudinaryStats.resourceTypes && cloudinaryStats.resourceTypes.length > 0 && (
            <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Resource Type Breakdown</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {cloudinaryStats.resourceTypes.map((resource, index) => (
                  <div key={index} className="border border-gray-200 dark:border-gray-800 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-3">{resource.type}</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Files:</span>
                        <span className="font-semibold text-gray-900 dark:text-white">{formatNumber(resource.totalCount)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Size:</span>
                        <span className="font-semibold text-gray-900 dark:text-white">{formatBytes(resource.size)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Detailed Stats */}
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Account Details</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-800">
                <span className="text-gray-600 dark:text-gray-400">Plan</span>
                <span className="font-semibold text-gray-900 dark:text-white">{cloudinaryStats.plan}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-800">
                <span className="text-gray-600 dark:text-gray-400">Total Transformations</span>
                <span className="font-semibold text-gray-900 dark:text-white">{formatNumber(cloudinaryStats.transformations)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-800">
                <span className="text-gray-600 dark:text-gray-400">Remaining Storage</span>
                <span className="font-semibold text-gray-900 dark:text-white">{formatBytes(cloudinaryStats.maxStorage - cloudinaryStats.usedStorage)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-800">
                <span className="text-gray-600 dark:text-gray-400">Bandwidth Limit</span>
                <span className="font-semibold text-gray-900 dark:text-white">{cloudinaryStats.bandwidthLimit > 0 ? formatBytes(cloudinaryStats.bandwidthLimit) : 'Unlimited'}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cloudflare R2 Stats */}
      {activeTab === 'cloudflare' && cloudflareStats && (
        <div className="space-y-4">
          {/* Storage Usage Overview */}
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Storage Usage</h2>
              <span className="text-sm font-medium text-[#17b6b2]">{cloudflareStats.usagePercentage.toFixed(2)}%</span>
            </div>
            <div className="mb-4">
              <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
                <span>{formatBytes(cloudflareStats.bucketSize)} used</span>
                <span>{formatBytes(cloudflareStats.storageLimit)} total</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                <div
                  className="bg-[#17b6b2] h-3 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(cloudflareStats.usagePercentage, 100)}%` }}
                ></div>
              </div>
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {formatBytes(cloudflareStats.storageLimit - cloudflareStats.bucketSize)} remaining
            </div>
          </div>

          {/* Overview Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center border border-gray-200 dark:border-gray-700">
                  <Server className="w-5 h-5 text-[#17b6b2]" strokeWidth={1.5} />
                </div>
                <div className="text-right">
                  <p className="text-2xl font-semibold text-gray-900 dark:text-white">{cloudflareStats.bucketName}</p>
                </div>
              </div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Bucket Name</p>
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center border border-gray-200 dark:border-gray-700">
                  <HardDrive className="w-5 h-5 text-[#17b6b2]" strokeWidth={1.5} />
                </div>
                <div className="text-right">
                  <p className="text-2xl font-semibold text-gray-900 dark:text-white">{formatNumber(cloudflareStats.objectCount)}</p>
                </div>
              </div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Objects</p>
            </div>
          </div>

          {/* File Type Breakdown */}
          {cloudflareStats.fileTypes && cloudflareStats.fileTypes.length > 0 && (
            <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">File Type Breakdown</h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-800">
                      <th className="text-left py-3 px-2 text-sm font-semibold text-gray-600 dark:text-gray-400">File Type</th>
                      <th className="text-right py-3 px-2 text-sm font-semibold text-gray-600 dark:text-gray-400">Count</th>
                      <th className="text-right py-3 px-2 text-sm font-semibold text-gray-600 dark:text-gray-400">Total Size</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cloudflareStats.fileTypes.slice(0, 10).map((fileType, index) => (
                      <tr key={index} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <td className="py-3 px-2 text-sm font-medium text-gray-900 dark:text-white">{fileType.type}</td>
                        <td className="py-3 px-2 text-sm text-right text-gray-600 dark:text-gray-400">{formatNumber(fileType.count)}</td>
                        <td className="py-3 px-2 text-sm text-right font-semibold text-gray-900 dark:text-white">{formatBytes(fileType.size)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Folder Breakdown */}
          {cloudflareStats.folders && cloudflareStats.folders.length > 0 && (
            <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Folder Breakdown</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {cloudflareStats.folders.slice(0, 9).map((folder, index) => (
                  <div key={index} className="border border-gray-200 dark:border-gray-800 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-3 truncate">{folder.name}</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Files:</span>
                        <span className="font-semibold text-gray-900 dark:text-white">{formatNumber(folder.count)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Size:</span>
                        <span className="font-semibold text-gray-900 dark:text-white">{formatBytes(folder.size)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Bucket Details */}
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Bucket Details</h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-800">
                <span className="text-gray-600 dark:text-gray-400">Bucket Name</span>
                <span className="font-semibold text-gray-900 dark:text-white">{cloudflareStats.bucketName}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-800">
                <span className="text-gray-600 dark:text-gray-400">Last Modified</span>
                <span className="font-semibold text-gray-900 dark:text-white">{new Date(cloudflareStats.lastModified).toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
