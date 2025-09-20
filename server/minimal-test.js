// Minimal test server for Railway debugging
const express = require('express');

const app = express();

// Simple middleware
app.use(express.json());

// CORS for testing
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  next();
});

// Test routes
app.get('/', (req, res) => {
  console.log('Root route hit');
  res.json({
    status: 'ok',
    message: 'Minimal Railway test server',
    timestamp: new Date().toISOString(),
    port: process.env.PORT || 'not set'
  });
});

app.get('/test', (req, res) => {
  console.log('Test route hit');
  res.json({
    status: 'success',
    message: 'Test endpoint working',
    env: process.env.NODE_ENV || 'not set'
  });
});

// Health check
app.get('/health', (req, res) => {
  console.log('Health check hit');
  res.json({ healthy: true });
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: err.message });
});

// Start server
const PORT = process.env.PORT || 3000;

console.log('=== MINIMAL RAILWAY TEST SERVER ===');
console.log('PORT env var:', process.env.PORT);
console.log('Using port:', PORT);
console.log('NODE_ENV:', process.env.NODE_ENV);

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Minimal server listening on 0.0.0.0:${PORT}`);
  console.log(`🌐 Test at: http://localhost:${PORT}`);
}).on('error', (err) => {
  console.error('❌ Server error:', err);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
  });
});