const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const path = require('path');
// Load environment variables
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config(); // Will load from server/.env
}

const connectDB = require('./config/database');
const authRoutes = require('./routes/auth');
const userManagementRoutes = require('./routes/userManagement');
const profileRoutes = require('./routes/profile');
const passwordResetRoutes = require('./routes/passwordReset');
const projectRoutes = require('./routes/projects');
const boardRoutes = require('./routes/boards');
const listRoutes = require('./routes/lists');
const cardRoutes = require('./routes/cards');
const activityRoutes = require('./routes/activities');
const automationRoutes = require('./routes/automation');
const SocketManager = require('./config/socket');
const ProjectSocketManager = require('./config/projectSocket');
// Initialize automation service with error handling
let automationService;
try {
  automationService = require('./services/automationService');
  console.log('✅ Automation service initialized');
} catch (error) {
  console.error('⚠️  Automation service initialization failed:', error.message);
  console.log('🚀 Server will continue without automation service');
}

const app = express();
const server = http.createServer(app);

// Connect to database with error handling
connectDB().catch(err => {
  console.error('❌ Database connection failed:', err.message);
  console.log('⚠️  Server will continue without database connection');
});

// Initialize Socket.IO with error handling
let socketManager, projectSocketManager;
try {
  socketManager = new SocketManager(server);
  projectSocketManager = new ProjectSocketManager(socketManager);

  // Make socket manager available throughout the app
  app.set('socketManager', socketManager);
  app.set('projectSocketManager', projectSocketManager);
  console.log('✅ Socket.IO initialized successfully');
} catch (error) {
  console.error('⚠️  Socket.IO initialization failed:', error.message);
  console.log('🚀 Server will continue without Socket.IO');
}

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Rate limiting - More lenient for development
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Increased limit for development
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.'
  },
  skip: (req) => {
    // Skip rate limiting for development environment
    return process.env.NODE_ENV === 'development';
  }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Increased from 5 to 20 for auth attempts
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again later.'
  },
  skipSuccessfulRequests: true,
  skip: (req) => {
    // Skip rate limiting for development environment
    return process.env.NODE_ENV === 'development';
  }
});

// Apply auth rate limiter only to specific auth routes
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/forgot-password', authLimiter);

// CORS should come before general rate limiting
// Simple CORS middleware that always works
app.use((req, res, next) => {
  const allowedOrigins = [
    'https://euroshub-alone.vercel.app',
    'http://localhost:3000',
    'http://localhost:3001'
  ];

  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    // Default to Vercel app for production
    res.setHeader('Access-Control-Allow-Origin', 'https://euroshub-alone.vercel.app');
  }

  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-requested-with');
  res.setHeader('Access-Control-Expose-Headers', 'set-cookie');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  next();
});

console.log('🔧 CORS Configuration: Using custom middleware with hardcoded origins');

// Apply general rate limiter after CORS
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Serve static files (for avatar uploads)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Root route for Railway health checks
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'EuroHub Project Management API',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    status: 'running'
  });
});

// Simple health check route
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running successfully',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    port: process.env.PORT || 5001
  });
});

// Railway health check endpoint (expects /api)
app.get('/api', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'EuroHub PM API is running successfully',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0',
    cors: 'enabled'
  });
});

// API Health check route
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'EuroHub PM API is running successfully',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0',
    cors: 'enabled'
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/user-management', userManagementRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/password-reset', passwordResetRoutes);

// Project Management routes
app.use('/api/projects', projectRoutes);
app.use('/api/boards', boardRoutes);
app.use('/api/lists', listRoutes);
app.use('/api/cards', cardRoutes);
app.use('/api/activities', activityRoutes);
app.use('/api/automation', automationRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Error stack:', err.stack);
  
  let error = { ...err };
  error.message = err.message;

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    const message = 'Resource not found';
    error = { message, statusCode: 404 };
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const message = 'Duplicate field value entered';
    error = { message, statusCode: 400 };
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message).join(', ');
    error = { message, statusCode: 400 };
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    const message = 'Invalid token';
    error = { message, statusCode: 401 };
  }

  if (err.name === 'TokenExpiredError') {
    const message = 'Token expired';
    error = { message, statusCode: 401 };
  }

  res.status(error.statusCode || 500).json({
    success: false,
    message: error.message || 'Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

const PORT = process.env.PORT || 5001;

console.log('🚀 Starting server...');
console.log('📊 Environment variables check:');
console.log('  - NODE_ENV:', process.env.NODE_ENV || 'not set');
console.log('  - PORT:', PORT);
console.log('  - MONGODB_URI:', process.env.MONGODB_URI ? 'set' : 'not set');
console.log('  - JWT_SECRET:', process.env.JWT_SECRET ? 'set' : 'not set');
console.log('  - EMAIL_SERVICE:', process.env.EMAIL_SERVICE || 'not set');
console.log('  - CORS_ORIGIN:', process.env.CORS_ORIGIN || 'not set');

// Railway binding - try different approaches
const HOST = '0.0.0.0';

console.log(`🎯 Attempting to bind to ${HOST}:${PORT}`);

server.listen(PORT, HOST, () => {
  console.log(`✅ Server successfully bound to ${HOST}:${PORT}`);
  console.log(`🌐 Server running in ${process.env.NODE_ENV || 'development'} mode`);
  console.log(`🔗 Socket.IO enabled for real-time communication`);
  console.log(`🌐 Health check: http://${HOST}:${PORT}/api/health`);
  console.log(`🚀 Railway URL: https://euroshub-alone-production.up.railway.app`);
  console.log(`🎉 Server ready to accept connections!`);
}).on('error', (err) => {
  console.error('❌ Server failed to bind to port:', err);
  console.error('🔍 Attempted Port:', PORT, 'Host:', HOST);
  console.error('🔍 Error Code:', err.code);
  console.error('🔍 Error Message:', err.message);

  // Try alternative port as fallback
  if (err.code === 'EADDRINUSE') {
    console.log('🔄 Port in use, trying alternative...');
    const altPort = PORT + 1;
    server.listen(altPort, HOST, () => {
      console.log(`✅ Server bound to alternative port ${HOST}:${altPort}`);
    });
  } else {
    process.exit(1);
  }
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.log(`Error: ${err.message}`);
  // Close server & exit process
  server.close(() => {
    process.exit(1);
  });
});

// Handle SIGTERM
process.on('SIGTERM', () => {
  console.log('SIGTERM received');
  server.close(() => {
    console.log('Process terminated');
  });
});

module.exports = app;