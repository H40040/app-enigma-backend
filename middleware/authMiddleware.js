const jwt = require('jsonwebtoken');

function authenticateToken(req, res, next) {
  // Check for token in cookies first (more secure), then fallback to Authorization header
  const token = req.cookies?.accessToken || 
    (req.headers.authorization && req.headers.authorization.split(' ')[1]);
  
  if (!token) {
    return res.status(401).json({ 
      error: 'Acesso não autorizado', 
      message: 'Token de autenticação não fornecido',
      code: 'token_required' 
    });
  }

  const JWT_SECRET = process.env.JWT_SECRET;
  if (!JWT_SECRET) {
    console.error('ERRO: JWT_SECRET não configurado no ambiente');
    return res.status(500).json({ error: 'Erro de configuração do servidor' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: 'Token expirado', 
        message: 'Sua sessão expirou. Por favor, faça login novamente',
        code: 'token_expired'
      });
    }
    return res.status(403).json({ 
      error: 'Token inválido', 
      message: 'O token de autenticação fornecido é inválido',
      code: 'token_invalid'
    });
  }
}

// Activity tracking middleware
function trackUserActivity(req, res, next) {
  // Skip tracking for non-authenticated routes
  if (!req.user) {
    return next();
  }
  
  const userId = req.user.id;
  
  // Store last active timestamp in-memory
  // In a production app, this would be stored in Redis or a database
  if (!global.userActivity) {
    global.userActivity = {};
  }
  
  // Update last activity time
  global.userActivity[userId] = new Date();
  
  next();
}

// Check if user session is inactive (no activity for X minutes)
function checkSessionActivity(req, res, next) {
  // Skip check for non-authenticated routes
  if (!req.user) {
    return next();
  }
  
  const userId = req.user.id;
  const MAX_INACTIVITY = process.env.MAX_INACTIVITY_MINUTES || 30; // 30 minutes default
  
  // If we have activity data for this user
  if (global.userActivity && global.userActivity[userId]) {
    const lastActive = global.userActivity[userId];
    const now = new Date();
    const diffMinutes = Math.floor((now - lastActive) / 60000);
    
    // If inactive for too long
    if (diffMinutes > MAX_INACTIVITY) {
      // Clear cookies
      res.clearCookie('accessToken');
      res.clearCookie('refreshToken', { path: '/api/auth/refresh-token' });
      
      // Remove activity tracking
      delete global.userActivity[userId];
      
      return res.status(401).json({
        error: 'Sessão inativa',
        message: 'Sua sessão expirou por inatividade. Por favor, faça login novamente.',
        code: 'session_inactive'
      });
    }
  }
  
  next();
}

module.exports = {
  authenticateToken,
  trackUserActivity,
  checkSessionActivity
};
