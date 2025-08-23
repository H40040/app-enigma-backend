const jwt = require('jsonwebtoken');
const InputValidator = require('../lib/validation');
const prisma = require('../lib/prisma');

const authenticateToken = (req, res, next) => {
  // Verificar se JWT_SECRET está configurado
  if (!process.env.JWT_SECRET) {
    console.error('[SECURITY] JWT_SECRET não configurado!');
    return res.status(500).json({ error: 'Erro de configuração do servidor' });
  }

  // Primeiro, tenta pegar o token do cookie
  let token = req.cookies?.accessToken;
  
  // Se não encontrar no cookie, tenta no header Authorization
  if (!token) {
    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7); // Remove 'Bearer '
    }
  }

  if (!token) {
    console.log(`[AUDIT] Tentativa de acesso sem token: IP=${req.ip}, URL=${req.originalUrl}`);
    return res.status(401).json({ error: 'Token de acesso requerido' });
  }

  // Validar formato básico do token
  if (typeof token !== 'string' || token.length > 1000) {
    console.log(`[AUDIT] Token inválido detectado: IP=${req.ip}`);
    return res.status(401).json({ error: 'Token inválido' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      console.log(`[AUDIT] Falha na verificação de token: IP=${req.ip}, Error=${err.name}`);
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'Token expirado' });
      }
      if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({ error: 'Token inválido' });
      }
      return res.status(403).json({ error: 'Falha na autenticação' });
    }
    
    // Validar estrutura do payload do token
    if (!user || !user.id || !user.email) {
      console.log(`[AUDIT] Token com payload inválido: IP=${req.ip}`);
      return res.status(401).json({ error: 'Token inválido' });
    }
    
    req.user = user;
    next();
  });
};

const trackUserActivity = async (req, res, next) => {
  if (req.user && req.user.id) {
    try {
      // Validar ID do usuário
      const userId = parseInt(req.user.id);
      if (isNaN(userId) || userId <= 0) {
        console.log(`[AUDIT] ID de usuário inválido no token: ${req.user.id}`);
        return res.status(401).json({ error: 'Token inválido' });
      }

      await prisma.user.update({
        where: { id: userId },
        data: { lastActivity: new Date() }
      });
      
      // Log de atividade para auditoria
      console.log(`[AUDIT] Atividade do usuário: UserID=${userId}, Action=${req.method} ${req.originalUrl}, IP=${req.ip}`);
    } catch (error) {
      console.error('Erro ao atualizar atividade do usuário:', error);
      // Se o usuário não existe, token pode estar comprometido
      if (error.code === 'P2025') {
        return res.status(401).json({ error: 'Usuário não encontrado' });
      }
    }
  }
  next();
};

const checkSessionActivity = async (req, res, next) => {
  if (req.user && req.user.id) {
    try {
      // Validar ID do usuário
      const userId = parseInt(req.user.id);
      if (isNaN(userId) || userId <= 0) {
        console.log(`[AUDIT] ID de usuário inválido na verificação de sessão: ${req.user.id}`);
        return res.status(401).json({ error: 'Token inválido' });
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { lastActivity: true, email: true }
      });

      if (!user) {
        console.log(`[AUDIT] Usuário não encontrado na verificação de sessão: UserID=${userId}`);
        return res.status(401).json({ error: 'Usuário não encontrado' });
      }

      const now = new Date();
      const lastActivity = new Date(user.lastActivity);
      const timeDiff = now - lastActivity;
      const hoursDiff = timeDiff / (1000 * 60 * 60);

      // Se a última atividade foi há mais de 24 horas, considerar sessão expirada
      if (hoursDiff > 24) {
        console.log(`[AUDIT] Sessão expirada por inatividade: UserID=${userId}, HoursInactive=${hoursDiff.toFixed(2)}`);
        return res.status(401).json({ error: 'Sessão expirada por inatividade' });
      }
      
      // Se a última atividade foi há mais de 1 hora, logar para monitoramento
      if (hoursDiff > 1) {
        console.log(`[AUDIT] Sessão com inatividade prolongada: UserID=${userId}, HoursInactive=${hoursDiff.toFixed(2)}`);
      }
    } catch (error) {
      console.error('Erro ao verificar atividade da sessão:', error);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }
  next();
};

module.exports = {
  authenticateToken,
  trackUserActivity,
  checkSessionActivity
};
