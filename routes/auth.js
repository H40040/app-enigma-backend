// backend/routes/auth.js
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const router = express.Router();
const prisma = require('../lib/prisma');
const InputValidator = require('../lib/validation');

// Remover o valor padrão hardcoded para maior segurança
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('AVISO: JWT_SECRET não configurado. Use uma variável de ambiente segura.');
}
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || JWT_SECRET + '-refresh';
// Tempo de expiração reduzido para segurança - 15 minutos para o token de acesso
const ACCESS_TOKEN_EXPIRATION = process.env.ACCESS_TOKEN_EXPIRATION || '15m';
// Tempo maior para o refresh token (uma semana)
const REFRESH_TOKEN_EXPIRATION = process.env.REFRESH_TOKEN_EXPIRATION || '7d';

// Import the auth middleware instead of redefining it here
const { authenticateToken, trackUserActivity, checkSessionActivity } = require('../middleware/authMiddleware');

// Helper function to generate tokens
const generateTokens = (user) => {
  // Access token - short lived
  const accessToken = jwt.sign(
    { id: user.id, name: user.name, email: user.email }, 
    JWT_SECRET, 
    { expiresIn: ACCESS_TOKEN_EXPIRATION }
  );
  
  // Refresh token - longer lived
  const refreshToken = jwt.sign(
    { id: user.id }, 
    REFRESH_TOKEN_SECRET, 
    { expiresIn: REFRESH_TOKEN_EXPIRATION }
  );
  
  return { accessToken, refreshToken };
};

router.post('/verify-user', async (req, res) => {
  console.log('[DEBUG] Raw req.body:', req.body);
  console.log('[DEBUG] Body type:', typeof req.body);
  
  let email, password;
  
  // Tratar diferentes formatos de body
  if (typeof req.body === 'string') {
    try {
      // Se o body é uma string, tentar fazer parse JSON
      const parsed = JSON.parse(req.body);
      email = parsed.email;
      password = parsed.password;
    } catch (e) {
      // Se não conseguir fazer parse, pode ser que seja apenas o email como string
      console.log('[DEBUG] Failed to parse body as JSON:', e.message);
      return res.status(400).json({ error: 'Formato de dados inválido' });
    }
  } else if (typeof req.body === 'object' && req.body !== null) {
    // Body já é um objeto
    email = req.body.email;
    password = req.body.password;
  } else {
    return res.status(400).json({ error: 'Dados não fornecidos' });
  }
  
  console.log('[DEBUG] Extracted email:', email);
  console.log('[DEBUG] Extracted password type:', typeof password);

  // Validação e sanitização de inputs
  let emailValidation;
  try {
    emailValidation = InputValidator.validateEmail(email);
    console.log('[DEBUG] Email validation result:', emailValidation);
  } catch (validationError) {
    console.error('[ERROR] Email validation failed:', validationError);
    return res.status(500).json({ error: 'Erro na validação de email', details: validationError.message });
  }
  
  if (!emailValidation.isValid) {
    return res.status(400).json({ error: emailValidation.error });
  }

  if (!password || typeof password !== 'string') {
    return res.status(400).json({ error: 'Senha é obrigatória' });
  }

  if (password.length > 128) {
    return res.status(400).json({ error: 'Senha inválida' });
  }

  try {
    const user = await prisma.user.findUnique({ where: { email: emailValidation.sanitized } });
    
    // Log de tentativa de login (sem dados sensíveis)
    console.log(`[AUDIT] Tentativa de login: Email=${emailValidation.sanitized}, IP=${req.ip}`);
    
    if (!user) {
      // Delay para prevenir timing attacks
      await new Promise(resolve => setTimeout(resolve, 1000));
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      // Log de tentativa de login falhada
      console.log(`[AUDIT] Login falhado: Email=${emailValidation.sanitized}, IP=${req.ip}`);
      // Delay para prevenir timing attacks
      await new Promise(resolve => setTimeout(resolve, 1000));
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }
    
    // Log de login bem-sucedido
    console.log(`[AUDIT] Login bem-sucedido: UserID=${user.id}, Email=${emailValidation.sanitized}, IP=${req.ip}`);

    // Generate tokens using our helper function
    const { accessToken, refreshToken } = generateTokens(user);
    
    // Set HTTP-only cookies (more secure than localStorage)
    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // Only use secure in production
      sameSite: 'strict',
      maxAge: 15 * 60 * 1000, // 15 minutes in milliseconds
    });
    
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true, 
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
      path: '/api/auth/refresh-token', // Only accessible by the refresh endpoint
    });
    
    // Still send tokens in response for clients that prefer not to use cookies
    res.json({ 
      id: user.id, 
      name: user.name, 
      email: user.email,
      accessToken,
      refreshToken 
    });
  } catch (error) {
    console.error('Erro na autenticação:', error);
    console.error('Stack trace:', error.stack);
    console.error('Error message:', error.message);
    console.error('Error name:', error.name);
    res.status(500).json({ error: 'Erro interno no servidor', details: error.message });
  }
});

// Apply all middleware in sequence: auth check, inactivity check, and track activity
router.get('/profile', authenticateToken, checkSessionActivity, trackUserActivity, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });
  // Nunca retorne a senha do usuário
  res.json({ user: { id: user.id, name: user.name, email: user.email, isAdmin: user.isAdmin, createdAt: user.createdAt } });
});

// Endpoint to refresh tokens
router.post('/refresh-token', async (req, res) => {
  const { refreshToken } = req.body;
  
  // If no refresh token is provided
  if (!refreshToken) {
    return res.status(401).json({ 
      error: 'Refresh token não fornecido', 
      code: 'refresh_token_required' 
    });
  }
  
  try {
    // Verify the refresh token
    const decoded = jwt.verify(refreshToken, REFRESH_TOKEN_SECRET);
    
    // Find the user
    const user = await prisma.user.findUnique({ where: { id: decoded.id } });
    if (!user) {
      return res.status(404).json({ 
        error: 'Usuário não encontrado', 
        code: 'user_not_found' 
      });
    }
    
    // Generate new tokens
    const tokens = generateTokens(user);
    
    // Set cookies for better security
    res.cookie('accessToken', tokens.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // Only use secure in production
      sameSite: 'strict',
      maxAge: 15 * 60 * 1000, // 15 minutes in milliseconds
    });
    
    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true, 
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
      path: '/api/auth/refresh-token', // Only accessible by the refresh endpoint
    });
    
    // Return tokens in the response as well (for clients that don't use cookies)
    res.json({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email
      }
    });
    
  } catch (error) {
    console.error('Erro ao renovar token:', error);
    return res.status(403).json({ 
      error: 'Refresh token inválido ou expirado', 
      code: 'refresh_token_invalid' 
    });
  }
});

// Logout endpoint
router.post('/logout', (req, res) => {
  // Clear both access and refresh token cookies
  res.clearCookie('accessToken');
  res.clearCookie('refreshToken', { 
    path: '/api/auth/refresh-token' 
  });
  
  res.json({ message: 'Logout realizado com sucesso' });
});

// Endpoint para alteração de senha
router.post('/change-password', authenticateToken, async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  // Validação dos campos obrigatórios
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ 
      error: 'Senha atual e nova senha são obrigatórias' 
    });
  }

  // Validar nova senha com critérios de segurança
  const passwordValidation = InputValidator.validatePassword(newPassword);
  if (!passwordValidation.isValid) {
    return res.status(400).json({ error: passwordValidation.error });
  }

  if (currentPassword.length > 128 || newPassword.length > 128) {
    return res.status(400).json({ error: 'Senha inválida' });
  }

  try {
    // Buscar o usuário atual
    const user = await prisma.user.findUnique({ 
      where: { id: req.user.id } 
    });
    
    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    // Verificar se a senha atual está correta
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      return res.status(401).json({ error: 'Senha atual incorreta' });
    }

    // Verificar se a nova senha é diferente da atual
    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword) {
      return res.status(400).json({ 
        error: 'A nova senha deve ser diferente da senha atual' 
      });
    }

    // Hash da nova senha com salt mais alto
    const hashedNewPassword = await bcrypt.hash(newPassword, 12);
    
    // Log de mudança de senha (sem dados sensíveis)
    console.log(`[AUDIT] Senha alterada: UserID=${req.user.id}, IP=${req.ip}`);

    // Atualizar a senha no banco de dados
    await prisma.user.update({
      where: { id: req.user.id },
      data: { password: hashedNewPassword }
    });

    console.log(`[AUTH] Senha alterada com sucesso para usuário ID: ${req.user.id}`);
    
    res.json({ 
      success: true, 
      message: 'Senha alterada com sucesso' 
    });

  } catch (error) {
    console.error('[AUTH] Erro ao alterar senha:', error);
    res.status(500).json({ 
      error: 'Erro interno no servidor ao alterar senha',
      details: error.message 
    });
  }
});

module.exports = router;
