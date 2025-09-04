const express = require('express');
const prisma = require('../lib/prisma');
const { authenticateToken, trackUserActivity } = require('../middleware/authMiddleware');
const InputValidator = require('../lib/validation');
const router = express.Router();

// Get a specific message publicly (e.g., for recipients)
router.get('/:id/public', async (req, res) => {
  const { id } = req.params;
  try {
    const message = await prisma.message.findUnique({
      where: { id },
      include: {
        replies: { // Assuming 'replies' is the relation field in Prisma schema
          orderBy: {
            createdAt: 'asc',
          },
        },
        // We don't include sender's User object here for privacy on public view
      },
    });

    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    // Increment view count
    await prisma.message.update({
      where: { id },
      data: { views: { increment: 1 } },
    });

    // Return the message (which now includes the updated view count implicitly if re-fetched,
    // or client can assume view was incremented)
    // For simplicity, we return the message fetched before view increment,
    // or we can re-fetch, but that's an extra DB call.
    // The client usually doesn't need the absolute latest view count immediately after viewing.
    res.json(message);
  } catch (error) {
    console.error('Error fetching public message:', error);
    if (error.code === 'P2025') { // Prisma error code for record not found during update (if message was deleted between find and update)
        return res.status(404).json({ error: 'Message not found or could not be updated.' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Criar nova mensagem
router.post('/', async (req, res) => {
  const {
    senderId,
    recipientId,
    recipientUsername,
    recipientEmail,
    recipientPhone,
    contactMethod,
    content,
    imageUrl
  } = req.body;

  // Validação e sanitização do conteúdo da mensagem
  const contentValidation = InputValidator.validateMessageContent(content);
  if (!contentValidation.isValid) {
    return res.status(400).json({ error: contentValidation.error });
  }

  // Validação do senderId
  if (!senderId || typeof senderId !== 'string') {
    return res.status(400).json({ error: 'ID do remetente é obrigatório' });
  }

  // Validação do método de contato
  if (!contactMethod || !['email', 'phone', 'username'].includes(contactMethod)) {
    return res.status(400).json({ error: 'Método de contato inválido' });
  }

  // Validação do email do destinatário se fornecido
  let sanitizedEmail = null;
  if (recipientEmail) {
    const emailValidation = InputValidator.validateEmail(recipientEmail);
    if (!emailValidation.isValid) {
      return res.status(400).json({ error: `Email do destinatário: ${emailValidation.error}` });
    }
    sanitizedEmail = emailValidation.sanitized;
  }

  // Validação do telefone do destinatário se fornecido
  let sanitizedPhone = null;
  if (recipientPhone) {
    const phoneValidation = InputValidator.validatePhone(recipientPhone);
    if (!phoneValidation.isValid) {
      return res.status(400).json({ error: `Telefone do destinatário: ${phoneValidation.error}` });
    }
    sanitizedPhone = phoneValidation.sanitized;
  }

  // Validação do nome de usuário do destinatário se fornecido
  let sanitizedUsername = null;
  if (recipientUsername) {
    const usernameValidation = InputValidator.validateName(recipientUsername);
    if (!usernameValidation.isValid) {
      return res.status(400).json({ error: `Nome de usuário do destinatário: ${usernameValidation.error}` });
    }
    sanitizedUsername = usernameValidation.sanitized;
  }

  try {
    // Log de criação de mensagem para auditoria
    console.log(`[AUDIT] Criação de mensagem: SenderID=${senderId}, IP=${req.ip}`);
    console.log('[DEBUG] Dados para criação:', {
      senderId,
      recipientId: recipientId || null,
      recipientUsername: sanitizedUsername,
      recipientEmail: sanitizedEmail,
      recipientPhone: sanitizedPhone,
      contactMethod,
      content: contentValidation.sanitized,
      imageUrl: imageUrl || null,
    });

    const message = await prisma.message.create({
      data: {
        senderId,
        recipientId: recipientId || null,
        recipientUsername: sanitizedUsername,
        recipientEmail: sanitizedEmail,
        recipientPhone: sanitizedPhone,
        contactMethod,
        content: contentValidation.sanitized,
        imageUrl: imageUrl || null,
      },
      include: {
        replies: true
      }
    });
    console.log('[DEBUG] Mensagem criada com sucesso:', message.id);
    res.status(201).json(message);
  } catch (error) {
    console.error('Erro ao criar mensagem:', error);
    console.error('Stack trace:', error.stack);
    console.error('Error message:', error.message);
    console.error('Error name:', error.name);
    if (error.code) {
      console.error('Error code:', error.code);
    }
    res.status(500).json({ error: 'Erro interno ao criar mensagem.', details: error.message });
  }
});

// Adicionar resposta a uma mensagem
router.post('/:id/reply', async (req, res) => {
  const { id } = req.params;
  const { content, fromRecipient } = req.body;
  
  // Validação do ID da mensagem
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'ID da mensagem inválido' });
  }

  // Validação e sanitização do conteúdo da resposta
  const contentValidation = InputValidator.validateMessageContent(content);
  if (!contentValidation.isValid) {
    return res.status(400).json({ error: contentValidation.error });
  }

  // Validação da origem da resposta
  if (typeof fromRecipient !== 'boolean') {
    return res.status(400).json({ error: 'Origem da resposta deve ser especificada' });
  }
  try {
    // Verifica se a mensagem existe
    const message = await prisma.message.findUnique({ where: { id } });
    if (!message) {
      return res.status(404).json({ error: 'Mensagem não encontrada.' });
    }
    // Log de resposta para auditoria
    console.log(`[AUDIT] Resposta a mensagem: MessageID=${id}, FromRecipient=${fromRecipient}, IP=${req.ip}`);
    
    // Cria a resposta
    const reply = await prisma.reply.create({
      data: {
        messageId: id,
        content: contentValidation.sanitized,
        fromRecipient,
      },
    });
    // Retorna a resposta criada
    res.status(201).json(reply);
  } catch (error) {
    console.error('Erro ao criar resposta:', error);
    res.status(500).json({ error: 'Erro interno ao criar resposta.' });
  }
});

// Buscar todas as mensagens (para inbox/sent)
router.get('/', async (req, res) => {
  try {
    const messages = await prisma.message.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        replies: { orderBy: { createdAt: 'asc' } }
      }
    });
    res.json(messages);
  } catch (error) {
    console.error('Erro ao buscar mensagens:', error);
    res.status(500).json({ error: 'Erro interno ao buscar mensagens.' });
  }
});

// Marcar mensagem como lida
router.put('/:id/read', async (req, res) => {
  const { id } = req.params;
  try {
    const message = await prisma.message.findUnique({ where: { id } });
    if (!message) {
      return res.status(404).json({ error: 'Mensagem não encontrada.' });
    }

    // Atualiza o status de leitura
    const updatedMessage = await prisma.message.update({
      where: { id },
      data: { isRead: true }
    });

    res.json({ success: true, message: updatedMessage });
  } catch (error) {
    console.error('Erro ao marcar mensagem como lida:', error);
    res.status(500).json({ error: 'Erro interno ao marcar mensagem como lida.' });
  }
});

// Deletar uma mensagem e suas replies
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    // Deleta replies associadas primeiro
    await prisma.reply.deleteMany({ where: { messageId: id } });
    // Deleta a mensagem
    const deleted = await prisma.message.delete({ where: { id } });
    res.json({ success: true, deleted });
  } catch (error) {
    console.error('Erro ao deletar mensagem:', error, error?.code, error?.meta, error?.message);
    if (error.code === 'P2025' || (typeof error.message === 'string' && error.message.includes('No record found'))) {
      return res.status(404).json({ error: 'Mensagem não encontrada.' });
    }
    res.status(500).json({ error: 'Erro interno ao deletar mensagem.' });
  }
});

module.exports = router;
