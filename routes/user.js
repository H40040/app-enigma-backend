const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const InputValidator = require('../lib/validation');

// Search users by name
router.get('/search', async (req, res) => {
  const { name } = req.query;

  // Validação e sanitização do parâmetro de busca
  const nameValidation = InputValidator.validateName(name);
  if (!nameValidation.isValid) {
    return res.status(400).json({ error: nameValidation.error });
  }

  // Limitar tamanho da busca para prevenir ataques
  if (nameValidation.sanitized.length < 2) {
    return res.status(400).json({ error: 'Nome deve ter pelo menos 2 caracteres' });
  }

  if (nameValidation.sanitized.length > 50) {
    return res.status(400).json({ error: 'Nome muito longo para busca' });
  }

  try {
    // Log de busca para auditoria
    console.log(`[AUDIT] Busca de usuário: Query=${nameValidation.sanitized}, IP=${req.ip}`);
    
    const users = await prisma.user.findMany({
      where: {
        name: {
          contains: nameValidation.sanitized
        }
      },
      select: {
        id: true,
        name: true,
        email: true
      },
      take: 20 // Limitar resultados para performance
    });
    console.log('[USER SEARCH] Found users:', users);
    res.json(users);
  } catch (error) {
    console.error('[USER SEARCH] Error searching users:', error);
    // Adiciona detalhes do erro para debug em desenvolvimento
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Check user by contact (email or whatsapp)
router.get('/check-contact', async (req, res) => {
  const { email, whatsapp } = req.query;

  // Validar que pelo menos um campo foi fornecido
  if (!email && !whatsapp) {
    return res.status(400).json({ error: 'Email ou WhatsApp deve ser fornecido' });
  }

  try {
    let user = null;

    // Buscar por email se fornecido
    if (email) {
      const emailValidation = InputValidator.validateEmail(email);
      if (!emailValidation.isValid) {
        return res.status(400).json({ error: `Email: ${emailValidation.error}` });
      }

      user = await prisma.user.findUnique({
        where: { email: emailValidation.sanitized },
        select: {
          id: true,
          name: true,
          email: true,
          whatsapp: true
        }
      });
    }

    // Buscar por WhatsApp se fornecido e não encontrou por email
    if (!user && whatsapp) {
      const phoneValidation = InputValidator.validatePhone(whatsapp);
      if (!phoneValidation.isValid) {
        return res.status(400).json({ error: `WhatsApp: ${phoneValidation.error}` });
      }

      user = await prisma.user.findFirst({
        where: { whatsapp: phoneValidation.sanitized },
        select: {
          id: true,
          name: true,
          email: true,
          whatsapp: true
        }
      });
    }

    if (user) {
      res.json({
        exists: true,
        user: user
      });
    } else {
      res.json({
        exists: false,
        message: 'Usuário não encontrado'
      });
    }

  } catch (error) {
    console.error('[USER CHECK] Error checking user by contact:', error);
    res.status(500).json({ error: 'Erro interno ao verificar usuário' });
  }
});

module.exports = router;
