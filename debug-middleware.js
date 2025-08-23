const { authenticateToken } = require('./middleware/authMiddleware');

// Configurar JWT_SECRET
process.env.JWT_SECRET = 'test-secret';

// Mock simples
const req = {
  headers: {},
  cookies: {},
  ip: '127.0.0.1',
  originalUrl: '/test'
};

const res = {
  status: function(code) {
    console.log('res.status called with:', code);
    return this;
  },
  json: function(data) {
    console.log('res.json called with:', data);
    return this;
  }
};

const next = function() {
  console.log('next() called');
};

console.log('Testing middleware without token...');
authenticateToken(req, res, next);