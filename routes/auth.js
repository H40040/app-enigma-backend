// backend/routes/auth.js
const express = require('express');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const router = express.Router();
const prisma = new PrismaClient();

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
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email e senha são obrigatórios' });
  }

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(401).json({ error: 'Usuário não encontrado' });

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) return res.status(401).json({ error: 'Senha incorreta' });

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
    res.status(500).json({ error: 'Erro interno no servidor' });
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
      return res.status(403).json({ 
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

  // Validação do tamanho da nova senha
  if (newPassword.length < 6) {
    return res.status(400).json({ 
      error: 'A nova senha deve ter pelo menos 6 caracteres' 
    });
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

    // Hash da nova senha
    const saltRounds = 10;
    const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

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
