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

module.exports = router;