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
const TOKEN_EXPIRATION = process.env.TOKEN_EXPIRATION || '1h'; // tempo de expiração da sessão

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token não fornecido' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Token inválido ou expirado' });
    req.user = user;
    next();
  });
}

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

    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email }, 
      JWT_SECRET, 
      { expiresIn: TOKEN_EXPIRATION }
    );

    res.json({ id: user.id, name: user.name, token });
  } catch (error) {
    console.error('Erro na autenticação:', error);
    res.status(500).json({ error: 'Erro interno no servidor' });
  }
});

router.get('/profile', authenticateToken, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });
  res.json({ user });
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
