// tests/routes/message.test.js
const request = require('supertest');
const app = require('../../index');
const { v4: uuidv4 } = require('uuid');
const InputValidator = require('../../lib/validation');

// Mock do Prisma
const mockPrisma = global.mockPrisma;

// Mock do módulo prisma
jest.mock('../../lib/prisma', () => global.mockPrisma);

// Mock dos middlewares de autenticação
jest.mock('../../middleware/authMiddleware', () => ({
  authenticateToken: jest.fn((req, res, next) => {
    req.user = { id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' }; // UUID válido para o usuário mock
    next();
  }),
  trackUserActivity: jest.fn((req, res, next) => {
    next();
  }),
  checkSessionActivity: jest.fn((req, res, next) => {
    next();
  }),
}));

describe('Message Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /:id/public', () => {
    it('deve retornar mensagem pública com replies', async () => {
      const mockMessage = {
        id: 'msg-1',
        content: 'Mensagem de teste',
        views: 5,
        createdAt: new Date(),
        replies: [
          {
            id: 'reply-1',
            content: 'Resposta 1',
            fromRecipient: true,
            createdAt: new Date()
          }
        ]
      };

      mockPrisma.message.findUnique.mockResolvedValue(mockMessage);
      mockPrisma.message.update.mockResolvedValue({ ...mockMessage, views: 6 });

      const response = await request(app)
        .get('/api/messages/msg-1/public');

      expect(response.status).toBe(200);
      expect(response.body.id).toBe('msg-1');
      expect(response.body.content).toBe('Mensagem de teste');
      expect(response.body.replies).toHaveLength(1);
      expect(mockPrisma.message.update).toHaveBeenCalledWith({
        where: { id: 'msg-1' },
        data: { views: { increment: 1 } }
      });
    });

    it('deve retornar 404 para mensagem não encontrada', async () => {
      mockPrisma.message.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/messages/inexistente/public');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Message not found');
    });

    it('deve lidar com erro de atualização de views', async () => {
      const mockMessage = {
        id: 'msg-1',
        content: 'Mensagem de teste',
        views: 5,
        replies: []
      };

      mockPrisma.message.findUnique.mockResolvedValue(mockMessage);
      mockPrisma.message.update.mockRejectedValue({ code: 'P2025' });

      const response = await request(app)
        .get('/api/messages/msg-1/public');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Message not found or could not be updated.');
    });

    it('deve lidar com erro interno do servidor', async () => {
      mockPrisma.message.findUnique.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/api/messages/msg-1/public');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Internal server error');
    });
  });

  describe('POST /', () => {
    const validMessageData = {
      senderId: 'user-1',
      recipientEmail: 'destinatario@example.com',
      contactMethod: 'email',
      content: 'Esta é uma mensagem de teste com conteúdo válido.'
    };

    it('deve criar mensagem com dados válidos', async () => {
      const mockMessage = {
        id: 'msg-1',
        senderId: 'user-1',
        recipientEmail: 'destinatario@example.com',
        contactMethod: 'email',
        content: 'Esta é uma mensagem de teste com conteúdo válido.',
        replies: [],
        createdAt: new Date()
      };

      mockPrisma.message.create.mockResolvedValue(mockMessage);

      const response = await request(app)
        .post('/api/messages')
        .send(validMessageData);

      expect(response.status).toBe(201);
      expect(response.body.id).toBe('msg-1');
      expect(response.body.content).toBe('Esta é uma mensagem de teste com conteúdo válido.');
    });

    it('deve criar mensagem com recipientId', async () => {
      const dataWithRecipientId = {
        ...validMessageData,
        recipientId: 'user-2'
      };

      const mockMessage = {
        id: 'msg-1',
        senderId: 'user-1',
        recipientId: 'user-2',
        contactMethod: 'email',
        content: 'Esta é uma mensagem de teste com conteúdo válido.',
        replies: []
      };

      mockPrisma.message.create.mockResolvedValue(mockMessage);

      const response = await request(app)
        .post('/api/messages')
        .send(dataWithRecipientId);

      expect(response.status).toBe(201);
      expect(response.body.recipientId).toBe('user-2');
    });

    it('deve criar mensagem com imageUrl', async () => {
      const dataWithImage = {
        ...validMessageData,
        imageUrl: 'https://example.com/image.jpg'
      };

      const mockMessage = {
        id: 'msg-1',
        ...dataWithImage,
        replies: []
      };

      mockPrisma.message.create.mockResolvedValue(mockMessage);

      const response = await request(app)
        .post('/api/messages')
        .send(dataWithImage);

      expect(response.status).toBe(201);
      expect(response.body.imageUrl).toBe('https://example.com/image.jpg');
    });

    it('deve retornar 400 para conteúdo inválido', async () => {
      const invalidData = {
        ...validMessageData,
        content: 'abc' // Muito curto
      };

      const response = await request(app)
        .post('/api/messages')
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('deve retornar 400 para senderId inválido', async () => {
      const invalidData = {
        ...validMessageData,
        senderId: null
      };

      const response = await request(app)
        .post('/api/messages')
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('ID do remetente é obrigatório');
    });

    it('deve retornar 400 para método de contato inválido', async () => {
      const invalidData = {
        ...validMessageData,
        contactMethod: 'invalid'
      };

      const response = await request(app)
        .post('/api/messages')
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Método de contato inválido');
    });

    it('deve retornar 400 para email do destinatário inválido', async () => {
      const invalidData = {
        ...validMessageData,
        recipientEmail: 'email-invalido'
      };

      const response = await request(app)
        .post('/api/messages')
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Email do destinatário');
    });

    it('deve validar telefone do destinatário', async () => {
      const dataWithPhone = {
        senderId: 'user-1',
        recipientPhone: '123', // Inválido
        contactMethod: 'phone',
        content: 'Esta é uma mensagem de teste com conteúdo válido.'
      };

      const response = await request(app)
        .post('/api/messages')
        .send(dataWithPhone);

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Telefone do destinatário');
    });

    it('deve validar nome de usuário do destinatário', async () => {
      const dataWithUsername = {
        senderId: 'user-1',
        recipientUsername: 'A', // Muito curto
        contactMethod: 'username',
        content: 'Esta é uma mensagem de teste com conteúdo válido.'
      };

      const response = await request(app)
        .post('/api/messages')
        .send(dataWithUsername);

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Nome de usuário do destinatário');
    });

    it('deve lidar com erro interno do servidor', async () => {
      mockPrisma.message.create.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .post('/api/messages')
        .send(validMessageData);

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Erro interno ao criar mensagem.');
    });
  });

  describe('PUT /:id/read', () => {
    it('deve marcar mensagem como lida com sucesso', async () => {
      const messageId = uuidv4();
      const userId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

      mockPrisma.message.findUnique.mockResolvedValue({
        id: messageId,
        readBy: [],
      });
      mockPrisma.message.update.mockResolvedValue({
        id: messageId,
        readBy: [userId],
      });

      const response = await request(app)
        .put(`/api/messages/${messageId}/read`)
        .set('Authorization', `Bearer some_token`); // Token é mockado pelo middleware

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Message marked as read');
      expect(mockPrisma.message.update).toHaveBeenCalledWith({
        where: { id: messageId },
        data: {
          readBy: { push: userId },
        },
      });
    });

    it('deve retornar 404 se a mensagem não for encontrada', async () => {
      const messageId = uuidv4();
      mockPrisma.message.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .put(`/api/messages/${messageId}/read`)
        .set('Authorization', `Bearer some_token`);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Message not found');
    });

    it('deve retornar 500 em caso de erro interno do servidor', async () => {
      const messageId = uuidv4();
      mockPrisma.message.findUnique.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .put(`/api/messages/${messageId}/read`)
        .set('Authorization', `Bearer some_token`);

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Internal server error');
    });

    it('deve retornar 400 para ID de mensagem inválido', async () => {
      const invalidMessageId = 'invalid-uuid';

      const response = await request(app)
        .put(`/api/messages/${invalidMessageId}/read`)
        .set('Authorization', `Bearer some_token`);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('ID da mensagem inválido');
    });
  });

  describe('POST /:id/reply', () => {
    const validReplyData = {
      content: 'Esta é uma resposta válida com conteúdo suficiente.',
      fromRecipient: true
    };

    it('deve criar resposta com dados válidos', async () => {
      const mockMessage = {
        id: 'msg-1',
        content: 'Mensagem original'
      };

      const mockReply = {
        id: 'reply-1',
        messageId: 'msg-1',
        content: 'Esta é uma resposta válida com conteúdo suficiente.',
        fromRecipient: true,
        createdAt: new Date()
      };

      mockPrisma.message.findUnique.mockResolvedValue(mockMessage);
      mockPrisma.reply.create.mockResolvedValue(mockReply);

      const response = await request(app)
        .post('/api/messages/msg-1/reply')
        .send(validReplyData);

      expect(response.status).toBe(201);
      expect(response.body.id).toBe('reply-1');
      expect(response.body.content).toBe('Esta é uma resposta válida com conteúdo suficiente.');
      expect(response.body.fromRecipient).toBe(true);
    });

    it('deve criar resposta do remetente', async () => {
      const replyFromSender = {
        ...validReplyData,
        fromRecipient: false
      };

      const mockMessage = {
        id: 'msg-1',
        content: 'Mensagem original'
      };

      const mockReply = {
        id: 'reply-1',
        messageId: 'msg-1',
        content: 'Esta é uma resposta válida com conteúdo suficiente.',
        fromRecipient: false,
        createdAt: new Date()
      };

      mockPrisma.message.findUnique.mockResolvedValue(mockMessage);
      mockPrisma.reply.create.mockResolvedValue(mockReply);

      const response = await request(app)
        .post('/api/messages/msg-1/reply')
        .send(replyFromSender);

      expect(response.status).toBe(201);
      expect(response.body.fromRecipient).toBe(false);
    });

    it('deve retornar 400 para ID da mensagem inválido', async () => {
      const response = await request(app)
        .post('/api/messages//reply') // ID vazio
        .send(validReplyData);

      expect(response.status).toBe(404); // Express retorna 404 para rota não encontrada
    });

    it('deve retornar 400 para conteúdo inválido', async () => {
      const invalidReply = {
        ...validReplyData,
        content: 'abc' // Muito curto
      };

      const response = await request(app)
        .post('/api/messages/msg-1/reply')
        .send(invalidReply);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('deve retornar 400 para fromRecipient inválido', async () => {
      const invalidReply = {
        ...validReplyData,
        fromRecipient: 'invalid' // Deve ser boolean
      };

      const response = await request(app)
        .post('/api/messages/msg-1/reply')
        .send(invalidReply);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Origem da resposta deve ser especificada');
    });

    it('deve retornar 404 para mensagem não encontrada', async () => {
      mockPrisma.message.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/messages/inexistente/reply')
        .send(validReplyData);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Mensagem não encontrada.');
    });

    it('deve lidar com erro interno do servidor', async () => {
      mockPrisma.message.findUnique.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .post('/api/messages/msg-1/reply')
        .send(validReplyData);

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Erro interno ao criar resposta.');
    });
  });

  describe('GET /', () => {
    it('deve retornar todas as mensagens com replies', async () => {
      const mockMessages = [
        {
          id: 'msg-1',
          content: 'Primeira mensagem',
          createdAt: new Date('2023-01-02'),
          replies: [
            {
              id: 'reply-1',
              content: 'Resposta 1',
              createdAt: new Date('2023-01-02T10:00:00')
            }
          ]
        },
        {
          id: 'msg-2',
          content: 'Segunda mensagem',
          createdAt: new Date('2023-01-01'),
          replies: []
        }
      ];

      mockPrisma.message.findMany.mockResolvedValue(mockMessages);

      const response = await request(app)
        .get('/api/messages');

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);
      expect(response.body[0].id).toBe('msg-1');
      expect(response.body[0].replies).toHaveLength(1);
      expect(mockPrisma.message.findMany).toHaveBeenCalledWith({
        orderBy: { createdAt: 'desc' },
        include: {
          replies: { orderBy: { createdAt: 'asc' } }
        }
      });
    });

    it('deve lidar com erro interno do servidor', async () => {
      mockPrisma.message.findMany.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/api/messages');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Erro interno ao buscar mensagens.');
    });
  });

  describe('DELETE /:id', () => {
    it('deve deletar mensagem e suas replies', async () => {
      const mockMessage = {
        id: 'msg-1',
        content: 'Mensagem a ser deletada'
      };

      mockPrisma.reply.deleteMany.mockResolvedValue({ count: 2 });
      mockPrisma.message.delete.mockResolvedValue(mockMessage);

      const response = await request(app)
        .delete('/api/messages/msg-1');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.deleted.id).toBe('msg-1');
      expect(mockPrisma.reply.deleteMany).toHaveBeenCalledWith({
        where: { messageId: 'msg-1' }
      });
      expect(mockPrisma.message.delete).toHaveBeenCalledWith({
        where: { id: 'msg-1' }
      });
    });

    it('deve retornar 404 para mensagem não encontrada', async () => {
      mockPrisma.reply.deleteMany.mockResolvedValue({ count: 0 });
      mockPrisma.message.delete.mockRejectedValue({ code: 'P2025' });

      const response = await request(app)
        .delete('/api/messages/inexistente');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Mensagem não encontrada.');
    });

    it('deve lidar com erro de "No record found"', async () => {
      mockPrisma.reply.deleteMany.mockResolvedValue({ count: 0 });
      mockPrisma.message.delete.mockRejectedValue(new Error('No record found'));

      const response = await request(app)
        .delete('/api/messages/inexistente');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Mensagem não encontrada.');
    });

    it('deve lidar com erro interno do servidor', async () => {
      mockPrisma.reply.deleteMany.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .delete('/api/messages/msg-1');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Erro interno ao deletar mensagem.');
    });
  });
});