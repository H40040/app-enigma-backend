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

module.exports = router;
