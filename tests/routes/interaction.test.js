// tests/routes/interaction.test.js

// Mock do módulo prisma
jest.mock('../../lib/prisma', () => global.mockPrisma);

// Mock do middleware de autenticação
jest.mock('../../middleware/authMiddleware', () => ({
  authenticateToken: (req, res, next) => {
    req.user = { id: 'user-1', email: 'test@example.com', role: 'USER' };
    next();
  },
  trackUserActivity: (req, res, next) => next(),
  checkSessionActivity: (req, res, next) => next()
}));

// Mock do JWT
jest.mock('jsonwebtoken');

const request = require('supertest');
const app = require('../../index');
const jwt = require('jsonwebtoken');

// Mock do Prisma
const mockPrisma = global.mockPrisma;

describe('Interaction Routes', () => {
  let validToken;
  let mockUser;
  let mockAdmirer;
  let mockHint;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockUser = {
      id: 'user-1',
      email: 'test@example.com',
      role: 'USER'
    };

    mockAdmirer = {
      id: 'admirer-1',
      userId: 'user-1',
      email: 'test@example.com'
    };

    mockHint = {
      id: 'hint-1',
      content: 'Dica de teste',
      admirerId: 'admirer-1'
    };

    validToken = 'valid-jwt-token';
    jwt.verify.mockReturnValue(mockUser);
  });

  describe('POST /interaction/answer', () => {
    it('deve responder uma interação com sucesso', async () => {
      const mockInteraction = {
        id: 1,
        hintId: 'hint-1',
        content: 'Pergunta teste',
        answer: null,
        hint: mockHint
      };

      const updatedInteraction = {
        ...mockInteraction,
        answer: 'Resposta teste',
        answeredAt: new Date()
      };

      mockPrisma.interaction.findUnique.mockResolvedValue(mockInteraction);
      mockPrisma.admirer.findUnique.mockResolvedValue(mockAdmirer);
      mockPrisma.interaction.update.mockResolvedValue(updatedInteraction);

      const response = await request(app)
        .post('/api/interactions/interaction/answer')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          id: 1,
          answer: 'Resposta teste'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.interaction.answer).toBe('Resposta teste');
      expect(mockPrisma.interaction.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          answer: 'Resposta teste',
          answeredAt: expect.any(Date)
        }
      });
    });

    it('deve sanitizar a resposta', async () => {
      const mockInteraction = {
        id: 1,
        hintId: 'hint-1',
        content: 'Pergunta teste',
        answer: null,
        hint: mockHint
      };

      mockPrisma.interaction.findUnique.mockResolvedValue(mockInteraction);
      mockPrisma.admirer.findUnique.mockResolvedValue(mockAdmirer);
      mockPrisma.interaction.update.mockResolvedValue(mockInteraction);

      const response = await request(app)
        .post('/api/interactions/interaction/answer')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          id: 1,
          answer: '  Resposta com espaços  '
        });

      expect(response.status).toBe(200);
      expect(mockPrisma.interaction.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          answer: 'Resposta com espaços',
          answeredAt: expect.any(Date)
        }
      });
    });

    it('deve retornar 400 para ID inválido', async () => {
      const response = await request(app)
        .post('/api/interactions/interaction/answer')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          id: 'invalid-id',
          answer: 'Resposta teste'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('ID da interação inválido');
    });

    it('deve retornar 400 para ID zero ou negativo', async () => {
      const response = await request(app)
        .post('/api/interactions/interaction/answer')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          id: 0,
          answer: 'Resposta teste'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('ID da interação inválido');
    });

    it('deve retornar 400 para resposta vazia', async () => {
      const response = await request(app)
        .post('/api/interactions/interaction/answer')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          id: 1,
          answer: ''
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Resposta é obrigatória');
    });

    it('deve retornar 400 para resposta não string', async () => {
      const response = await request(app)
        .post('/api/interactions/interaction/answer')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          id: 1,
          answer: 123
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Resposta é obrigatória');
    });

    it('deve retornar 400 para resposta apenas com espaços', async () => {
      const response = await request(app)
        .post('/api/interactions/interaction/answer')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          id: 1,
          answer: '   '
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Resposta não pode estar vazia');
    });

    it('deve retornar 400 para resposta muito longa', async () => {
      const longAnswer = 'A'.repeat(501);

      const response = await request(app)
        .post('/api/interactions/interaction/answer')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          id: 1,
          answer: longAnswer
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Resposta muito longa (máximo 500 caracteres)');
    });

    it('deve aceitar resposta com exatamente 500 caracteres', async () => {
      const exactAnswer = 'A'.repeat(500);
      const mockInteraction = {
        id: 1,
        hintId: 'hint-1',
        content: 'Pergunta teste',
        answer: null,
        hint: mockHint
      };

      mockPrisma.interaction.findUnique.mockResolvedValue(mockInteraction);
      mockPrisma.admirer.findUnique.mockResolvedValue(mockAdmirer);
      mockPrisma.interaction.update.mockResolvedValue(mockInteraction);

      const response = await request(app)
        .post('/api/interactions/interaction/answer')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          id: 1,
          answer: exactAnswer
        });

      expect(response.status).toBe(200);
    });

    it('deve retornar 404 para interação não encontrada', async () => {
      mockPrisma.interaction.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/interactions/interaction/answer')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          id: 999,
          answer: 'Resposta teste'
        });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Interação não encontrada.');
    });

    it('deve retornar 403 para usuário sem permissão', async () => {
      const mockInteraction = {
        id: 1,
        hintId: 'hint-1',
        content: 'Pergunta teste',
        answer: null,
        hint: mockHint
      };

      const otherAdmirer = {
        id: 'admirer-2',
        email: 'other@example.com'
      };

      mockPrisma.interaction.findUnique.mockResolvedValue(mockInteraction);
      mockPrisma.admirer.findUnique.mockResolvedValue(otherAdmirer);

      const response = await request(app)
        .post('/api/interactions/interaction/answer')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          id: 1,
          answer: 'Resposta teste'
        });

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Acesso negado');
    });

    it('deve retornar 403 para acesso negado', async () => {
      const response = await request(app)
        .post('/api/interactions/interaction/answer')
        .send({
          id: 1,
          answer: 'Resposta teste'
        });

      expect(response.status).toBe(403);
    });

    it('deve lidar com erro interno do servidor', async () => {
      mockPrisma.interaction.findUnique.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .post('/api/interactions/interaction/answer')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          id: 1,
          answer: 'Resposta teste'
        });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Erro interno ao salvar resposta.');
    });

    it('deve fazer log de auditoria', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const mockInteraction = {
        id: 1,
        hintId: 'hint-1',
        content: 'Pergunta teste',
        answer: null,
        hint: mockHint
      };

      mockPrisma.interaction.findUnique.mockResolvedValue(mockInteraction);
      mockPrisma.admirer.findUnique.mockResolvedValue(mockAdmirer);
      mockPrisma.interaction.update.mockResolvedValue(mockInteraction);

      await request(app)
        .post('/api/interactions/interaction/answer')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          id: 1,
          answer: 'Resposta teste'
        });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[AUDIT] Resposta de interação: UserID=user-1, InteractionID=1')
      );

      consoleSpy.mockRestore();
    });
  });

  describe('GET /hint/:id/interactions', () => {
    it('deve buscar interações de uma dica', async () => {
      const mockInteractions = [
        {
          id: 1,
          hintId: 'hint-1',
          content: 'Primeira pergunta',
          answer: 'Primeira resposta',
          createdAt: new Date('2023-01-01')
        },
        {
          id: 2,
          hintId: 'hint-1',
          content: 'Segunda pergunta',
          answer: null,
          createdAt: new Date('2023-01-02')
        }
      ];

      mockPrisma.hint.findUnique.mockResolvedValue({ ...mockHint, admirer: mockAdmirer });
      mockPrisma.interaction.findMany.mockResolvedValue(mockInteractions);

      const response = await request(app)
        .get('/api/interactions/hint/1/interactions');

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);
      expect(response.body[0].content).toBe('Primeira pergunta');
      expect(mockPrisma.interaction.findMany).toHaveBeenCalledWith({
        where: { hintId: "1" },
        orderBy: { createdAt: 'desc' },
        take: 50
      });
    });

    it('deve retornar 400 para ID inválido', async () => {
      const response = await request(app)
        .get('/api/interactions/hint/invalid-id/interactions');

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('ID da dica inválido');
    });

    it('deve retornar 400 para ID zero ou negativo', async () => {
      const response = await request(app)
        .get('/api/interactions/hint/0/interactions');

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('ID da dica inválido');
    });

    it('deve retornar 404 para dica não encontrada', async () => {
      mockPrisma.hint.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/interactions/hint/999/interactions');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Dica não encontrada');
    });

    it('deve retornar array vazio se não há interações', async () => {
      mockPrisma.hint.findUnique.mockResolvedValue({ ...mockHint, admirer: mockAdmirer });
      mockPrisma.interaction.findMany.mockResolvedValue([]);

      const response = await request(app)
        .get('/api/interactions/hint/1/interactions');

      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });

    it('deve limitar resultados a 50 interações', async () => {
      const manyInteractions = Array.from({ length: 60 }, (_, i) => ({
        id: i + 1,
        hintId: 'hint-1',
        content: `Pergunta ${i + 1}`,
        answer: null,
        createdAt: new Date()
      }));

      mockPrisma.hint.findUnique.mockResolvedValue({ ...mockHint, admirer: mockAdmirer });
      mockPrisma.interaction.findMany.mockResolvedValue(manyInteractions.slice(0, 50));

      const response = await request(app)
        .get('/api/interactions/hint/1/interactions');

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(50);
      expect(mockPrisma.interaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 50 })
      );
    });

    it('deve ordenar por data de criação decrescente', async () => {
      mockPrisma.hint.findUnique.mockResolvedValue({ ...mockHint, admirer: mockAdmirer });
      mockPrisma.interaction.findMany.mockResolvedValue([]);

      await request(app)
        .get('/api/interactions/hint/1/interactions');

      expect(mockPrisma.interaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: 'desc' }
        })
      );
    });

    it('deve lidar com erro interno do servidor', async () => {
      mockPrisma.hint.findUnique.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/api/interactions/hint/1/interactions');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Erro interno ao buscar interações');
    });

    it('deve fazer log de auditoria', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      mockPrisma.hint.findUnique.mockResolvedValue({ ...mockHint, admirer: mockAdmirer });
      mockPrisma.interaction.findMany.mockResolvedValue([]);

      await request(app)
        .get('/api/interactions/hint/1/interactions');

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[AUDIT] Acesso a dica: HintID=1')
      );

      consoleSpy.mockRestore();
    });
  });

  describe('POST /hint/:id/question', () => {
    it('deve criar uma pergunta com sucesso', async () => {
      const mockInteraction = {
        id: 1,
        hintId: '1',
        content: 'Nova pergunta',
        createdAt: new Date()
      };

      mockPrisma.hint.findUnique.mockResolvedValue(mockHint);
      mockPrisma.interaction.create.mockResolvedValue(mockInteraction);

      const response = await request(app)
        .post('/api/interactions/hint/1/question')
        .send({
          question: 'Nova pergunta'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(mockPrisma.interaction.create).toHaveBeenCalledWith({
        data: {
          hintId: '1',
          content: 'Nova pergunta',
          createdAt: expect.any(Date)
        }
      });
    });

    it('deve retornar 400 para pergunta vazia', async () => {
      const response = await request(app)
        .post('/api/interactions/hint/1/question')
        .send({
          question: ''
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Pergunta e ID são obrigatórios.');
    });

    it('deve retornar 400 para pergunta ausente', async () => {
      const response = await request(app)
        .post('/api/interactions/hint/1/question')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Pergunta e ID são obrigatórios.');
    });

    it('deve retornar 404 para dica não encontrada', async () => {
      mockPrisma.hint.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/interactions/hint/nonexistent/question')
        .send({
          question: 'Pergunta teste'
        });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Dica não encontrada.');
    });

    it('deve lidar com erro interno do servidor', async () => {
      mockPrisma.hint.findUnique.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .post('/api/interactions/hint/1/question')
        .send({
          question: 'Pergunta teste'
        });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Erro interno ao registrar pergunta.');
    });
  });

  describe('POST /hint/:id/answer', () => {
    it('deve responder primeira interação pendente', async () => {
      const mockInteraction = {
        id: 1,
        hintId: '1',
        content: 'Pergunta pendente',
        answer: null
      };

      const updatedInteraction = {
        ...mockInteraction,
        answer: 'Resposta da dica',
        answeredAt: new Date()
      };

      mockPrisma.interaction.findFirst.mockResolvedValue(mockInteraction);
      mockPrisma.interaction.update.mockResolvedValue(updatedInteraction);

      const response = await request(app)
        .post('/api/interactions/hint/1/answer')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          answer: 'Resposta da dica'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(mockPrisma.interaction.findFirst).toHaveBeenCalledWith({
        where: {
          hintId: '1',
          answer: null
        },
        orderBy: { createdAt: 'asc' }
      });
      expect(mockPrisma.interaction.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          answer: 'Resposta da dica',
          answeredAt: expect.any(Date)
        }
      });
    });

    it('deve retornar 400 para resposta vazia', async () => {
      const response = await request(app)
        .post('/api/interactions/hint/1/answer')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          answer: ''
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('A resposta é obrigatória.');
    });

    it('deve retornar 400 para resposta ausente', async () => {
      const response = await request(app)
        .post('/api/interactions/hint/1/answer')
        .set('Authorization', `Bearer ${validToken}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('A resposta é obrigatória.');
    });

    it('deve retornar 404 se não há interações pendentes', async () => {
      mockPrisma.interaction.findFirst.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/interactions/hint/1/answer')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          answer: 'Resposta teste'
        });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Nenhuma interação pendente para esta dica.');
    });

    it('deve buscar primeira interação por ordem cronológica', async () => {
      mockPrisma.interaction.findFirst.mockResolvedValue(null);

      await request(app)
        .post('/api/interactions/hint/1/answer')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          answer: 'Resposta teste'
        });

      expect(mockPrisma.interaction.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: 'asc' }
        })
      );
    });

    it('deve retornar 404 para rota não encontrada sem autenticação adequada', async () => {
      const response = await request(app)
        .post('/api/interactions/hint/1/answer')
        .send({
          answer: 'Resposta teste'
        });

      expect(response.status).toBe(404);
    });

    it('deve lidar com erro interno do servidor', async () => {
      mockPrisma.interaction.findFirst.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .post('/api/interactions/hint/1/answer')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          answer: 'Resposta teste'
        });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Erro interno ao responder interação.');
    });
  });
});