const rateLimit = require('express-rate-limit');

// Rate limiter mais restritivo para rotas de autenticação
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // máximo 5 tentativas por IP (reduzido de 10)
  message: {
    error: 'Muitas tentativas de autenticação. Tente novamente em 15 minutos.',
    retryAfter: '15 minutos',
    code: 'AUTH_RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Não contar requests bem-sucedidos
  skipFailedRequests: false,
  skip: (req) => {
    // Pular rate limiting durante os testes e desenvolvimento
    return process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;
  },
  keyGenerator: (req) => {
    // Usar IP + User-Agent para melhor identificação
    return `${req.ip}-${req.get('User-Agent') || 'unknown'}`;
  },
  handler: (req, res, next, options) => {
    console.log(`[SECURITY] Rate limit atingido para autenticação: IP=${req.ip}, UserAgent=${req.get('User-Agent')}`);
    res.status(options.statusCode).json(options.message);
  }
});

// Rate limiter para mudança de senha (mais restritivo)
const passwordChangeLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 3, // máximo 3 mudanças de senha por hora
  message: {
    error: 'Muitas tentativas de mudança de senha. Tente novamente em 1 hora.',
    retryAfter: '1 hora',
    code: 'PASSWORD_CHANGE_RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Pular rate limiting durante os testes
    return process.env.NODE_ENV === 'test';
  },
  keyGenerator: (req) => {
    // Para usuários autenticados, usar o ID do usuário
    return req.user ? `user-${req.user.id}` : req.ip;
  },
  handler: (req, res, next, options) => {
    console.log(`[SECURITY] Rate limit atingido para mudança de senha: UserID=${req.user?.id}, IP=${req.ip}`);
    res.status(options.statusCode).json(options.message);
  }
});

// Rate limiter para validações (CPF, WhatsApp)
const validationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 20, // máximo 20 validações por IP
  message: {
    error: 'Muitas tentativas de validação. Tente novamente em 15 minutos.',
    retryAfter: '15 minutos',
    code: 'VALIDATION_RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Pular rate limiting durante os testes
    return process.env.NODE_ENV === 'test';
  },
  handler: (req, res, next, options) => {
    console.log(`[SECURITY] Rate limit atingido para validação: IP=${req.ip}, Path=${req.path}`);
    res.status(options.statusCode).json(options.message);
  }
});

// Rate limiter geral para API
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // máximo 100 requests por IP
  message: {
    error: 'Muitas requisições. Tente novamente em 15 minutos.',
    retryAfter: '15 minutos',
    code: 'API_RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Pular rate limiting durante os testes ou para health checks
    return process.env.NODE_ENV === 'test' || req.path === '/health' || req.path === '/api/health';
  },
  handler: (req, res, next, options) => {
    console.log(`[SECURITY] Rate limit atingido para API: IP=${req.ip}, Path=${req.path}`);
    res.status(options.statusCode).json(options.message);
  }
});

// Rate limiter para criação de mensagens
const messageLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 10, // máximo 10 mensagens por hora por IP
  message: {
    error: 'Muitas mensagens enviadas. Tente novamente em 1 hora.',
    retryAfter: '1 hora',
    code: 'MESSAGE_RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Pular rate limiting durante os testes
    return process.env.NODE_ENV === 'test';
  },
  handler: (req, res, next, options) => {
    console.log(`[SECURITY] Rate limit atingido para mensagens: IP=${req.ip}`);
    res.status(options.statusCode).json(options.message);
  }
});

module.exports = {
  authLimiter,
  passwordChangeLimiter,
  validationLimiter,
  apiLimiter,
  messageLimiter
};
