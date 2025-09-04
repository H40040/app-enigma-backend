const express = require('express');
const prisma = require('../lib/prisma');
const { authenticateToken, trackUserActivity } = require('../middleware/authMiddleware');
const InputValidator = require('../lib/validation');
const router = express.Router();

// Get a specific message publicly (e.g., for recipients)
router.get('/:id/public', async (req, res) => {
  const { id } = req.params;
  
  const idValidation = InputValidator.validateUUID(id);
  if (!idValidation.isValid) {
    console.warn(`[WARN] Invalid message ID for public access: ${id} - ${idValidation.error}`);
    return res.status(400).json({ error: idValidation.error });
  }

  console.log('[DEBUG] Fetching public message:', id);

  try {
    const message = await prisma.message.findUnique({
      where: { id }
      // Temporariamente removido include replies até migração ser aplicada
      // include: {
      //   replies: {
      //     orderBy: {
      //       createdAt: 'asc',
      //     },
      //   },
      // },
    });

    console.log('[DEBUG] Message found:', !!message);

    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    // Increment view count
    console.log('[DEBUG] Incrementing view count for message:', id);
    await prisma.message.update({
      where: { id },
      data: { views: { increment: 1 } },
    });

    console.log('[DEBUG] View count incremented successfully');

    // Return the message (which now includes the updated view count implicitly if re-fetched,
    // or we can re-fetch, but that's an extra DB call.
    // The client usually doesn't need the absolute latest view count immediately after viewing.
    res.json(message);
  } catch (error) {
    console.error('Error fetching public message:', error);
    console.error('Error stack:', error.stack);
    console.error('Error message:', error.message);
    if (error.code) {
      console.error('Error code:', error.code);
      console.error('Error meta:', error.meta);
    }
    if (error.code === 'P2025') { // Prisma error code for record not found during update (if message was deleted between find and update)
        return res.status(404).json({ error: 'Message not found or could not be updated.' });
    }
    res.status(500).json({
      error: 'Internal server error',
      details: error.message,
      code: error.code
    });
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

  console.log('[DEBUG] Raw request body:', JSON.stringify(req.body, null, 2));

  // Validação e sanitização do conteúdo da mensagem
  const contentValidation = InputValidator.validateMessageContent(content);
  if (!contentValidation.isValid) {
    return res.status(400).json({ error: contentValidation.error });
  }

  // Validação do senderId
  const senderIdValidation = InputValidator.validateUUID(senderId);
  if (!senderIdValidation.isValid) {
    console.warn(`[WARN] Invalid sender ID for message creation: ${senderId} - ${senderIdValidation.error}`);
    return res.status(400).json({ error: `ID do remetente inválido: ${senderIdValidation.error}` });
  }

  // Validação do recipientId (se fornecido)
  if (recipientId) {
    const recipientIdValidation = InputValidator.validateUUID(recipientId);
    if (!recipientIdValidation.isValid) {
      console.warn(`[WARN] Invalid recipient ID for message creation: ${recipientId} - ${recipientIdValidation.error}`);
      return res.status(400).json({ error: `ID do destinatário inválido: ${recipientIdValidation.error}` });
    }
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

    // Verificar tamanhos dos campos antes de criar
    const dataToCreate = {
      senderId,
      recipientId: recipientId || null,
      recipientUsername: sanitizedUsername,
      recipientEmail: sanitizedEmail,
      recipientPhone: sanitizedPhone,
      contactMethod,
      content: contentValidation.sanitized,
      imageUrl: imageUrl || null,
    };

    console.log('[DEBUG] Verificação de tamanhos:');
    console.log('- recipientUsername:', sanitizedUsername?.length || 0, '/ 100');
    console.log('- recipientEmail:', sanitizedEmail?.length || 0, '/ 255');
    console.log('- recipientPhone:', sanitizedPhone?.length || 0, '/ 20');
    console.log('- contactMethod:', contactMethod?.length || 0, '/ 50');
    console.log('- content:', contentValidation.sanitized?.length || 0, '/ unlimited');
    console.log('- imageUrl:', (imageUrl || '').length, '/ 500');

    // Validar tamanho do imageUrl se fornecido
    if (imageUrl && imageUrl.length > 500) {
      console.log('[WARN] imageUrl muito longo, truncando...');
      imageUrl = imageUrl.substring(0, 500);
    }

    console.log('[DEBUG] Dados para criação:', dataToCreate);

    const message = await prisma.message.create({
      data: dataToCreate
    });
    console.log('[DEBUG] Mensagem criada com sucesso:', message.id);
    res.status(201).json({ message: 'Mensagem criada com sucesso!', messageId: message.id });
  } catch (error) {
    console.error('Erro ao criar mensagem:', error);
    console.error('Stack trace:', error.stack);
    console.error('Error message:', error.message);
    console.error('Error name:', error.name);
    if (error.code) {
      console.error('Error code:', error.code);
      console.error('Error meta:', error.meta);
    }
    res.status(500).json({
      error: 'Erro interno ao criar mensagem.',
      details: error.message,
      code: error.code,
      meta: error.meta
    });
  }
});

// Adicionar resposta a uma mensagem
router.post('/:id/reply', async (req, res) => {
  const { id } = req.params;
  const { content, fromRecipient } = req.body;
  
  // Validação do ID da mensagem
  const idValidation = InputValidator.validateUUID(id);
  if (!idValidation.isValid) {
    console.warn(`[WARN] Invalid message ID for reply: ${id} - ${idValidation.error}`);
    return res.status(400).json({ error: idValidation.error });
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
    console.log(`[DEBUG] Result of findUnique for message ${id}: ${JSON.stringify(message)}`);
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

// Buscar todas as mensagens (requer autenticação)
router.get('/', authenticateToken, trackUserActivity, async (req, res) => {
  const userId = req.user.id;
  const { type, page = 1, pageSize = 10 } = req.query;

  // Validação do userId (se for um UUID)
  const userIdValidation = InputValidator.validateUUID(userId);
  if (!userIdValidation.isValid) {
    console.warn(`[WARN] Invalid user ID for fetching messages: ${userId} - ${userIdValidation.error}`);
    return res.status(400).json({ error: userIdValidation.error });
  }
  try {
    const messages = await prisma.message.findMany({
      where: {
        OR: [
          { senderId: userId },
          { recipientId: userId }
        ],
        ...(type === 'inbox' && { recipientId: userId }),
        ...(type === 'sent' && { senderId: userId })
      },
      orderBy: { createdAt: 'desc' }
      // Temporariamente removido include replies até migração ser aplicada
      // include: {
      //   replies: { orderBy: { createdAt: 'asc' } }
      // }
    });
    console.log(`[DEBUG] Found ${messages.length} messages.`);
    res.json(messages);
  } catch (error) {
    console.error('Erro ao buscar mensagens:', error);
    res.status(500).json({ error: 'Erro interno ao buscar mensagens.' });
  }
});

// Marcar mensagem como lida
router.put('/:id/read', authenticateToken, trackUserActivity, async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  const idValidation = InputValidator.validateUUID(id);
  if (!idValidation.isValid) {
    console.warn(`[WARN] Invalid message ID for mark as read: ${id} - ${idValidation.error}`);
    return res.status(400).json({ error: idValidation.error });
  }

  console.log(`[DEBUG] Attempting to mark message ${id} as read by user ${userId}`);
  console.log(`[DEBUG] Message ID: ${id}, User ID: ${userId}, req.user: ${!!req.user}`);
  if (req.user) {
    console.log(`[DEBUG] req.user.id: ${req.user.id}`);
  }

  try {
    const message = await prisma.message.findUnique({ where: { id } });
    if (!message) {
      console.log('[DEBUG] Mensagem não encontrada para ID:', id);
      return res.status(404).json({ error: 'Mensagem não encontrada.' });
    }

    console.log('[DEBUG] Mensagem encontrada:', message.id);

    // Atualiza o status de leitura
    const updatedMessage = await prisma.message.update({
      where: { id },
      data: { isRead: true }
    });

    console.log('[DEBUG] Mensagem marcada como lida com sucesso');
    res.json({ success: true, message: updatedMessage });
  } catch (error) {
    console.error('Erro ao marcar mensagem como lida:', error);
    console.error('Error stack:', error.stack);
    console.error('Error message:', error.message);
    console.error('Error code:', error.code);
    res.status(500).json({
      error: 'Erro interno ao marcar mensagem como lida.',
      details: error.message,
      code: error.code
    });
  }
});

// Deletar mensagem (e suas respostas)
router.delete('/:id', authenticateToken, trackUserActivity, async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  const idValidation = InputValidator.validateUUID(id);
  if (!idValidation.isValid) {
    console.warn(`[WARN] Invalid message ID for deletion: ${id} - ${idValidation.error}`);
    return res.status(400).json({ error: idValidation.error });
  }
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
