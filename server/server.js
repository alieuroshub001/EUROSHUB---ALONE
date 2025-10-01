const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const path = require('path');
// Load environment variables
// Only load .env file in development or if no NODE_ENV is set
if (!process.env.NODE_ENV || process.env.NODE_ENV === 'development') {
  require('dotenv').config({ path: path.join(__dirname, '.env') });
}

// Railway-specific environment validation
if (process.env.NODE_ENV === 'production') {
  console.log('🔧 Railway Production Mode Detected');
  // Ensure critical environment variables are available
  if (!process.env.MONGODB_URI) {
    console.error('❌ MONGODB_URI is required in production');
  }
  if (!process.env.JWT_SECRET) {
    console.error('❌ JWT_SECRET is required in production');
  }
}

const connectDB = require('./config/database');
const authRoutes = require('./routes/auth');
const userManagementRoutes = require('./routes/userManagement');
const usersRoutes = require('./routes/users');
const profileRoutes = require('./routes/profile');
const passwordResetRoutes = require('./routes/passwordReset');
const projectRoutes = require('./routes/projects');
const boardRoutes = require('./routes/boards');
const listRoutes = require('./routes/lists');
const cardRoutes = require('./routes/cards');
// Trello-like independent board routes
const trelloBoardRoutes = require('./routes/trello-boards');
const trelloListRoutes = require('./routes/trello-lists');
const trelloCardRoutes = require('./routes/trello-cards');
const activityRoutes = require('./routes/activities');
const automationRoutes = require('./routes/automation');
const notificationRoutes = require('./routes/notifications');
const testEmailRoutes = require('./routes/test-email');
// File and folder management routes
const folderRoutes = require('./routes/folders');
const fileRoutes = require('./routes/files');
// Comment routes
const commentRoutes = require('./routes/comments');
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

// Configure trust proxy for Railway
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1); // Trust Railway's proxy
  console.log('🔧 Trust proxy enabled for Railway');
}

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

// CORS configuration - Dynamic origin handling for Railway + Vercel
const allowedOrigins = [
  'https://euroshub-alone.vercel.app',
  'http://localhost:3000',
  'http://localhost:3001',
  process.env.CLIENT_URL,
  process.env.FRONTEND_URL,
  process.env.NEXT_PUBLIC_SITE_URL,
  process.env.CORS_ORIGIN
].filter(Boolean); // Remove undefined values

app.use((req, res, next) => {
  const origin = req.headers.origin;
  const userAgent = req.headers['user-agent'];
  const timestamp = new Date().toISOString();

  // Always set CORS headers for production
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Access-Control-Allow-Origin', 'https://euroshub-alone.vercel.app');
  } else {
    // Development - allow any origin
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
  }

  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin, Cache-Control, Pragma');
  res.setHeader('Access-Control-Expose-Headers', 'Set-Cookie, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours

  // Handle preflight requests immediately
  if (req.method === 'OPTIONS') {
    res.status(200).json({ success: true, message: 'CORS preflight successful', timestamp });
    return;
  }
  next();
});

console.log('🔧 CORS Configuration: Fixed headers for Vercel app');

// Apply general rate limiter after CORS
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Minimal request logging middleware (only for errors or important routes)
app.use((req, res, next) => {
  // Only log non-health check requests and errors
  if (!req.path.includes('/health') && !req.path.includes('/socket.io')) {
    console.log(`🔧 ${req.method} ${req.path} from ${req.headers.origin || 'no-origin'}`);
  }
  next();
});

// Serve static files (for avatar uploads)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Root route for Railway health checks
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'EurosHub Project Management API',
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
    message: 'EurosHub PM API is running successfully',
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
    message: 'EurosHub PM API is running successfully',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0',
    cors: 'enabled'
  });
});
// API routes
app.use('/api/auth', authRoutes);
app.use('/api/user-management', userManagementRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/password-reset', passwordResetRoutes);

// Project Management routes (existing project-centric system)
app.use('/api/projects', projectRoutes);
app.use('/api/boards', boardRoutes);
app.use('/api/lists', listRoutes);
app.use('/api/cards', cardRoutes);

// Trello-like independent board routes
app.use('/api/trello-boards', trelloBoardRoutes);
app.use('/api/trello-lists', trelloListRoutes);
app.use('/api/trello-cards', trelloCardRoutes);

app.use('/api/activities', activityRoutes);
app.use('/api/automation', automationRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/test', testEmailRoutes);

// File and folder management routes
app.use('/api', folderRoutes);
app.use('/api', fileRoutes);

// Comment routes (integrated into cards routes, so commented out to avoid duplicates)
// app.use('/api', commentRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`
  });
});

// Global error handler
app.use((err, req, res, next) => {
  const timestamp = new Date().toISOString();
  console.error(`\n🚨 [${timestamp}] GLOBAL ERROR HANDLER:`);
  console.error(`   Request: ${req.method} ${req.path}`);
  console.error(`   Origin: ${req.headers.origin || 'NO ORIGIN'}`);
  console.error(`   Error Name: ${err.name}`);
  console.error(`   Error Message: ${err.message}`);
  console.error(`   Error Stack:`, err.stack);

  let error = { ...err };
  error.message = err.message;

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    const message = 'Resource not found';
    error = { message, statusCode: 404 };
    console.error(`   🔧 Handled as CastError (404)`);
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const message = 'Duplicate field value entered';
    error = { message, statusCode: 400 };
    console.error(`   🔧 Handled as Duplicate Key (400)`);
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message).join(', ');
    error = { message, statusCode: 400 };
    console.error(`   🔧 Handled as ValidationError (400)`);
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    const message = 'Invalid token';
    error = { message, statusCode: 401 };
    console.error(`   🔧 Handled as JWT Error (401)`);
  }

  if (err.name === 'TokenExpiredError') {
    const message = 'Token expired';
    error = { message, statusCode: 401 };
    console.error(`   🔧 Handled as Token Expired (401)`);
  }

  const responseStatus = error.statusCode || 500;
  console.error(`   📤 Sending response with status: ${responseStatus}`);

  res.status(responseStatus).json({
    success: false,
    message: error.message || 'Server Error',
    timestamp,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });

  console.error(`   ✅ Error response sent\n`);
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

// Railway binding configuration
const HOST = '0.0.0.0';

console.log(`🎯 Attempting to bind to ${HOST}:${PORT}`);
console.log(`⏰ Deployment timestamp: ${new Date().toISOString()}`);
console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
console.log(`🔧 Railway Public URL: ${process.env.RAILWAY_STATIC_URL || 'not set'}`);

server.listen(PORT, HOST, () => {
  console.log(`✅ Server successfully bound to ${HOST}:${PORT}`);
  console.log(`🌐 Server running in ${process.env.NODE_ENV || 'development'} mode`);
  console.log(`🔗 Socket.IO enabled for real-time communication`);
  console.log(`🌐 Health check: http://${HOST}:${PORT}/health`);
  console.log(`🌐 API Health check: http://${HOST}:${PORT}/api/health`);
  console.log(`🚀 Railway URL: ${process.env.RAILWAY_STATIC_URL || 'https://euroshub-alone-production.up.railway.app'}`);
  console.log(`🎉 Server ready to accept connections!`);
  console.log(`🔧 CORS Origins: ${allowedOrigins.join(', ')}`);
}).on('error', (err) => {
  console.error('❌ Server failed to bind to port:', err);
  console.error('🔍 Attempted Port:', PORT, 'Host:', HOST);
  console.error('🔍 Error Code:', err.code);
  console.error('🔍 Error Message:', err.message);
  console.error('🔍 Environment Variables:');
  console.error('   - PORT:', process.env.PORT);
  console.error('   - NODE_ENV:', process.env.NODE_ENV);
  console.error('   - RAILWAY_STATIC_URL:', process.env.RAILWAY_STATIC_URL);

  // Don't try alternative ports on Railway - let it fail fast
  if (process.env.NODE_ENV === 'production') {
    console.error('🚨 Production deployment failed - exiting');
    process.exit(1);
  } else {
    // Only try alternative port in development
    if (err.code === 'EADDRINUSE') {
      console.log('🔄 Port in use in development, trying alternative...');
      const altPort = PORT + 1;
      server.listen(altPort, HOST, () => {
        console.log(`✅ Server bound to alternative port ${HOST}:${altPort}`);
      });
    } else {
      process.exit(1);
    }
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