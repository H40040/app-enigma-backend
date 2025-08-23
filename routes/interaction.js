// backend/routes/interaction.js

const express = require('express');
const prisma = require('../lib/prisma');
const router = express.Router();
const { authenticateToken, trackUserActivity, checkSessionActivity } = require('../middleware/authMiddleware');
const InputValidator = require('../lib/validation');

// Proteger a rota com autenticação
router.post('/interaction/answer', authenticateToken, checkSessionActivity, trackUserActivity, async (req, res) => {
  const { id, answer } = req.body;

  // Validação do ID da interação
  if (!id || isNaN(parseInt(id)) || parseInt(id) <= 0) {
    return res.status(400).json({ error: 'ID da interação inválido' });
  }

  // Validação e sanitização da resposta
  if (!answer || typeof answer !== 'string') {
    return res.status(400).json({ error: 'Resposta é obrigatória' });
  }

  const sanitizedAnswer = InputValidator.sanitizeString(answer.trim());
  if (sanitizedAnswer.length === 0) {
    return res.status(400).json({ error: 'Resposta não pode estar vazia' });
  }

  if (sanitizedAnswer.length > 500) {
    return res.status(400).json({ error: 'Resposta muito longa (máximo 500 caracteres)' });
  }

  try {
    // Log de resposta para auditoria
    console.log(`[AUDIT] Resposta de interação: UserID=${req.user.id}, InteractionID=${id}, IP=${req.ip}`);
    
    // Verificar se a interação existe
    const existingInteraction = await prisma.interaction.findUnique({
      where: { id },
      include: { hint: true }
    });

    if (!existingInteraction) {
      return res.status(404).json({ error: 'Interação não encontrada.' });
    }

    // Verificar se o usuário tem permissão para responder
    const hint = existingInteraction.hint;
    const admirer = await prisma.admirer.findUnique({
      where: { id: hint.admirerId }
    });

    if (admirer.email !== req.user.email) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    const interaction = await prisma.interaction.update({
      where: { id },
      data: { 
        answer: sanitizedAnswer,
        answeredAt: new Date()
      },
    });

    res.json({ success: true, interaction });
  } catch (err) {
    console.error('Erro ao salvar resposta:', err);
    res.status(500).json({ error: 'Erro interno ao salvar resposta.' });
  }
});

// Adicionar rota para buscar interações de uma dica (AGORA PÚBLICA)
router.get('/hint/:id/interactions', async (req, res) => {
  try {
    const hintId = req.params.id;
    
    // Validação do ID da dica
    if (!hintId || isNaN(parseInt(hintId)) || parseInt(hintId) <= 0) {
      return res.status(400).json({ error: 'ID da dica inválido' });
    }

    // Log de acesso a dica para auditoria
    console.log(`[AUDIT] Acesso a dica: HintID=${hintId}, IP=${req.ip}`);
    
    const hint = await prisma.hint.findUnique({
      where: { id: hintId },
      include: { admirer: true }
    });
    
    if (!hint) {
      return res.status(404).json({ error: 'Dica não encontrada' });
    }
    
    // Não faz mais verificação de permissão, pois é pública
    
    const interactions = await prisma.interaction.findMany({
      where: { hintId },
      orderBy: { createdAt: 'desc' },
      take: 50 // Limitar resultados para performance
    });
    
    res.json(interactions);
  } catch (error) {
    console.error('Erro ao buscar interações:', error);
    res.status(500).json({ error: 'Erro interno ao buscar interações' });
  }
});

// Rota pública para enviar pergunta para uma dica
router.post('/hint/:id/question', async (req, res) => {
  const { id } = req.params;
  const { question } = req.body;

  if (!question || !id) {
    return res.status(400).json({ error: 'Pergunta e ID são obrigatórios.' });
  }

  try {
    // Verifica se a dica existe
    const hint = await prisma.hint.findUnique({ where: { id } });
    if (!hint) {
      return res.status(404).json({ error: 'Dica não encontrada.' });
    }

    // Cria a interação (pergunta)
    await prisma.interaction.create({
      data: {
        hintId: id,
        content: question, // Use apenas 'content', remova 'question'
        createdAt: new Date()
      }
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Erro ao registrar pergunta:', error);
    res.status(500).json({ error: 'Erro interno ao registrar pergunta.' });
  }
});

// Rota para responder uma interação de uma dica
router.post('/hint/:id/answer', authenticateToken, checkSessionActivity, trackUserActivity, async (req, res) => {
  const { id } = req.params;
  const { answer } = req.body;

  if (!answer) {
    return res.status(400).json({ error: 'A resposta é obrigatória.' });
  }

  try {
    // Busca a primeira interação sem resposta para esta dica
    const interaction = await prisma.interaction.findFirst({
      where: {
        hintId: id,
        answer: null
      },
      orderBy: { createdAt: 'asc' }
    });

    if (!interaction) {
      return res.status(404).json({ error: 'Nenhuma interação pendente para esta dica.' });
    }

    await prisma.interaction.update({
      where: { id: interaction.id },
      data: {
        answer,
        answeredAt: new Date()
      }
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Erro ao responder interação:', error);
    res.status(500).json({ error: 'Erro interno ao responder interação.' });
  }
});

module.exports = router;
