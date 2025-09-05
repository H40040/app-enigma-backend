// routes/health.js
const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');

// Health check endpoint
router.get('/', async (req, res) => {
  try {
    // Test database connection
    await prisma.$queryRaw`SELECT 1`;
    
    // Check environment variables
    const envCheck = {
      JWT_SECRET: !!process.env.JWT_SECRET,
      REFRESH_TOKEN_SECRET: !!process.env.REFRESH_TOKEN_SECRET,
      DATABASE_URL: !!process.env.DATABASE_URL,
      FRONTEND_URL: process.env.FRONTEND_URL,
      NODE_ENV: process.env.NODE_ENV
    };
    
    res.json({
      status: 'HEALTHY',
      timestamp: new Date().toISOString(),
      environment: envCheck,
      database: 'connected'
    });
  } catch (error) {
    console.error('Health check failed:', error);
    // console.log('DEBUG: Catch block for / endpoint hit!'); // Removed for debugging
    res.status(500).json({
      status: 'UNHEALTHY',
      timestamp: new Date().toISOString(),
      error: error.message,
      database: 'disconnected'
    });
  }
});

// Simple test endpoint
router.get('/test', (req, res) => {
  res.json({
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    headers: req.headers
  });
});

// Test POST endpoint to debug verify-user issues
router.post('/test-post', async (req, res) => {
  try {
    console.log('[DEBUG] Test POST - Body type:', typeof req.body);
    console.log('[DEBUG] Test POST - Body content:', req.body);
    console.log('[DEBUG] Test POST - Headers:', req.headers);
    
    // Test database connection
    const userCount = await prisma.user.count();
    
    res.json({
      message: 'POST test successful',
      timestamp: new Date().toISOString(),
      bodyType: typeof req.body,
      bodyContent: req.body,
      userCount: userCount,
      database: 'connected'
    });
  } catch (error) {
     console.error('[DEBUG] Test POST error:', error);
     // console.log('DEBUG: Catch block for /test-post endpoint hit!'); // Removed for debugging
     res.status(500).json({
       error: 'Test POST failed',
       message: error.message,
       timestamp: new Date().toISOString()
     });
   }
 });

// Endpoint simples para testar POST sem rate limiting
router.post('/simple-test', async (req, res) => {
  try {
    console.log('[DEBUG] Simple test endpoint hit');
    console.log('[DEBUG] Body:', req.body);
    
    res.json({
      message: 'Simple POST test successful',
      body: req.body,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[ERROR] Simple test failed:', error);
    res.status(500).json({ error: 'Simple test failed', details: error.message });
  }
});

// Endpoint simples para testar auth sem validação complexa
router.post('/test-auth', async (req, res) => {
  try {
    console.log('[DEBUG] Test auth endpoint hit');
    console.log('[DEBUG] Body:', req.body);
    
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email e senha são obrigatórios' });
    }
    
    // Test basic database query
    const userCount = await prisma.user.count();
    
    res.json({
      message: 'Test auth successful',
      email: email,
      userCount: userCount,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[ERROR] Test auth failed:', error);
    // console.log('DEBUG: Catch block for /test-auth endpoint hit!'); // Removed for debugging
    res.status(500).json({ error: 'Test auth failed', details: error.message });
  }
});

module.exports = router;