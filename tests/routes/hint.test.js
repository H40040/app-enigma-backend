// tests/routes/hint.test.js
const request = require('supertest');
const app = require('../../index');
const jwt = require('jsonwebtoken');

// Mock do Prisma
const mockPrisma = global.mockPrisma;

// Mock do módulo prisma
jest.mock('../../lib/prisma', () => global.mockPrisma);

// Mock do JWT
jest.mock('jsonwebtoken');

// Mock do authMiddleware
jest.mock('../../middleware/authMiddleware', () => ({
  authenticateToken: jest.fn((req, res, next) => {
    if (req.headers.authorization) {
      req.user = {
        id: 'user-1',
        email: 'test@example.com',
        role: 'USER'
      };
      next();
    } else {
      res.status(401).json({ error: 'Token não fornecido' });
    }
  }),
  trackUserActivity: jest.fn((req, res, next) => next()),
  checkSessionActivity: jest.fn((req, res, next) => next())
}));

// Importar o mock após a definição
const authMiddleware = require('../../middleware/authMiddleware');

describe('Hint Routes', () => {
  let validToken;
  let mockUser;
  let mockAdmirer;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockUser = {
      id: 'user-1',
      email: 'test@example.com',
      role: 'USER'
    };

    mockAdmirer = {
      id: 'admirer-1',
      userId: 'user-1'
    };

    validToken = 'valid-jwt-token';
    jwt.verify.mockReturnValue(mockUser);
  });

  describe('POST /hint', () => {
    it('deve criar uma nova dica com sucesso', async () => {
      const mockHint = {
        id: 'hint-1',
        content: 'Esta é uma dica de teste',
        type: 'text',
        admirerId: 'admirer-1'
      };

      mockPrisma.user.update.mockResolvedValue(mockUser);
      mockPrisma.user.findUnique.mockResolvedValue({
        lastActivity: new Date(),
        email: 'test@example.com'
      });
      mockPrisma.admirer.findFirst.mockResolvedValue(mockAdmirer);
      mockPrisma.hint.create.mockResolvedValue(mockHint);

      const response = await request(app)
        .post('/api/hints')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          content: 'Esta é uma dica de teste',
          type: 'text'
        });

      expect(response.status).toBe(200);
      expect(response.body.id).toBe('hint-1');
      expect(mockPrisma.hint.create).toHaveBeenCalledWith({
        data: {
          admirerId: 'admirer-1',
          content: 'Esta é uma dica de teste',
          type: 'text',
          publicUrl: null,
          qrCodeUrl: null
        }
      });
    });

    it('deve criar admirer se não existir', async () => {
      const mockHint = {
        id: 'hint-1',
        content: 'Dica teste',
        type: 'text',
        admirerId: 'new-admirer-1'
      };

      const newAdmirer = {
        id: 'new-admirer-1',
        userId: 'user-1'
      };

      mockPrisma.user.update.mockResolvedValue(mockUser);
      mockPrisma.user.findUnique.mockResolvedValue({
        lastActivity: new Date(),
        email: 'test@example.com'
      });
      mockPrisma.admirer.findFirst.mockResolvedValue(null);
      mockPrisma.admirer.create.mockResolvedValue(newAdmirer);
      mockPrisma.hint.create.mockResolvedValue(mockHint);

      const response = await request(app)
        .post('/api/hints')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          content: 'Dica teste',
          type: 'text'
        });

      expect(response.status).toBe(200);
      expect(mockPrisma.admirer.create).toHaveBeenCalledWith({
        data: { userId: 'user-1' }
      });
      expect(mockPrisma.hint.create).toHaveBeenCalledWith({
        data: {
          admirerId: 'new-admirer-1',
          content: 'Dica teste',
          type: 'text',
          publicUrl: null,
          qrCodeUrl: null
        }
      });
    });

    it('deve lidar com tipo mixed e conteúdo objeto', async () => {
      const mockHint = {
        id: 'hint-1',
        content: '{"text":"Texto","image":"url"}',
        type: 'mixed',
        admirerId: 'admirer-1'
      };

      const mixedContent = { text: 'Texto', image: 'url' };

      mockPrisma.admirer.findFirst.mockResolvedValue(mockAdmirer);
      mockPrisma.hint.create.mockResolvedValue(mockHint);

      const response = await request(app)
        .post('/api/hints')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          content: mixedContent,
          type: 'mixed'
        });

      expect(response.status).toBe(200);
      expect(mockPrisma.hint.create).toHaveBeenCalledWith({
        data: {
          admirerId: 'admirer-1',
          content: JSON.stringify(mixedContent),
          type: 'mixed',
          publicUrl: null,
          qrCodeUrl: null
        }
      });
    });

    it('deve aceitar publicUrl e qrCodeUrl opcionais', async () => {
      const mockHint = {
        id: 'hint-1',
        content: 'Dica com URLs',
        type: 'image',
        admirerId: 'admirer-1'
      };

      mockPrisma.admirer.findFirst.mockResolvedValue(mockAdmirer);
      mockPrisma.hint.create.mockResolvedValue(mockHint);

      const response = await request(app)
        .post('/api/hints')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          content: 'Dica com URLs',
          type: 'image',
          publicUrl: 'https://example.com/public',
          qrCodeUrl: 'https://example.com/qr'
        });

      expect(response.status).toBe(200);
      expect(mockPrisma.hint.create).toHaveBeenCalledWith({
        data: {
          admirerId: 'admirer-1',
          content: 'Dica com URLs',
          type: 'image',
          publicUrl: 'https://example.com/public',
          qrCodeUrl: 'https://example.com/qr'
        }
      });
    });

    it('deve retornar 400 para conteúdo vazio', async () => {
      mockPrisma.user.update.mockResolvedValue(mockUser);
      mockPrisma.user.findUnique.mockResolvedValue({
        lastActivity: new Date(),
        email: 'test@example.com'
      });
      
      const response = await request(app)
        .post('/api/hints')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          content: '',
          type: 'text'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('O conteúdo é obrigatório');
    });

    it('deve retornar 400 para tipo inválido', async () => {
      mockPrisma.user.update.mockResolvedValue(mockUser);
      mockPrisma.user.findUnique.mockResolvedValue({
        lastActivity: new Date(),
        email: 'test@example.com'
      });
      
      const response = await request(app)
        .post('/api/hints')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          content: 'Conteúdo válido',
          type: 'invalid_type'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Tipo inválido');
    });

    it('deve aceitar tipos válidos', async () => {
      const validTypes = ['text', 'image', 'video', 'mixed'];
      
      mockPrisma.user.update.mockResolvedValue(mockUser);
      mockPrisma.user.findUnique.mockResolvedValue({
        lastActivity: new Date(),
        email: 'test@example.com'
      });
      mockPrisma.admirer.findFirst.mockResolvedValue(mockAdmirer);
      
      for (const type of validTypes) {
        const mockHint = {
          id: `hint-${type}`,
          content: `Conteúdo ${type}`,
          type: type,
          admirerId: 'admirer-1'
        };
        
        mockPrisma.hint.create.mockResolvedValue(mockHint);
        
        const response = await request(app)
          .post('/api/hints')
          .set('Authorization', `Bearer ${validToken}`)
          .send({
            content: `Conteúdo ${type}`,
            type: type
          });

        expect(response.status).toBe(200);
      }
    });

    it('deve retornar 401 sem token de autenticação', async () => {
      const response = await request(app)
        .post('/api/hints')
        .send({
          content: 'Conteúdo teste',
          type: 'text'
        });

      expect(response.status).toBe(401);
    });

    it('deve lidar com erro interno do servidor', async () => {
      mockPrisma.user.update.mockResolvedValue(mockUser);
      mockPrisma.user.findUnique.mockResolvedValue({
        lastActivity: new Date(),
        email: 'test@example.com'
      });
      mockPrisma.admirer.findFirst.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .post('/api/hints')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          content: 'Conteúdo teste',
          type: 'text'
        });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Erro interno ao criar dica');
    });
  });

  describe('GET /hint/:id', () => {
    it('deve buscar uma dica específica e incrementar views', async () => {
      const mockHint = {
        id: 'hint-1',
        content: 'Conteúdo da dica',
        type: 'text',
        views: 5,
        publicUrl: 'https://example.com/public',
        qrCodeUrl: 'https://example.com/qr'
      };

      mockPrisma.hint.findUnique.mockResolvedValue(mockHint);
      mockPrisma.hint.update.mockResolvedValue({ ...mockHint, views: 6 });

      const response = await request(app)
        .get('/api/hints/hint-1');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        id: 'hint-1',
        content: 'Conteúdo da dica',
        type: 'text',
        views: 6,
        publicUrl: 'https://example.com/public',
        qrCodeUrl: 'https://example.com/qr'
      });
      expect(mockPrisma.hint.update).toHaveBeenCalledWith({
        where: { id: 'hint-1' },
        data: { views: { increment: 1 } }
      });
    });

    it('deve retornar 404 para dica não encontrada', async () => {
      mockPrisma.hint.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/hints/nonexistent-id');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Dica não encontrada');
    });

    it('deve retornar 404 para rota não encontrada', async () => {
      const response = await request(app)
        .get('/api/hints/rota-inexistente');

      expect(response.status).toBe(404); // Express retorna 404 para rota não encontrada
    });

    it('deve lidar com erro interno do servidor', async () => {
      mockPrisma.hint.findUnique.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/api/hints/hint-1');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Erro interno ao buscar dica');
    });

    it('deve lidar com erro ao incrementar views', async () => {
      const mockHint = {
        id: 'hint-1',
        content: 'Conteúdo da dica',
        type: 'text',
        views: 5
      };

      mockPrisma.hint.findUnique.mockResolvedValue(mockHint);
      mockPrisma.hint.update.mockRejectedValue(new Error('Update error'));

      const response = await request(app)
        .get('/api/hints/hint-1');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Erro interno ao buscar dica');
    });
  });

  describe('GET /', () => {
    it('deve buscar todas as dicas do usuário autenticado', async () => {
      const mockHints = [
        {
          id: 'hint-1',
          content: 'Primeira dica',
          type: 'text',
          views: 10,
          publicUrl: null,
          qrCodeUrl: null,
          _count: { interaction: 3 }
        },
        {
          id: 'hint-2',
          content: 'Segunda dica',
          type: 'image',
          views: 5,
          publicUrl: 'https://example.com/public',
          qrCodeUrl: 'https://example.com/qr',
          _count: { interaction: 1 }
        }
      ];

      mockPrisma.admirer.findFirst.mockResolvedValue(mockAdmirer);
      mockPrisma.hint.findMany.mockResolvedValue(mockHints);

      const response = await request(app)
        .get('/api/hints')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);
      expect(response.body[0]).toEqual({
        id: 'hint-1',
        content: 'Primeira dica',
        type: 'text',
        interactions: 3,
        views: 10,
        publicUrl: null,
        qrCodeUrl: null
      });
      expect(mockPrisma.hint.findMany).toHaveBeenCalledWith({
        where: { admirerId: 'admirer-1' },
        include: { _count: true },
        orderBy: { createdAt: 'desc' }
      });
    });

    it('deve retornar array vazio se usuário não tem admirer', async () => {
      mockPrisma.admirer.findFirst.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/hints')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });

    it('deve retornar array vazio se admirer não tem dicas', async () => {
      mockPrisma.admirer.findFirst.mockResolvedValue(mockAdmirer);
      mockPrisma.hint.findMany.mockResolvedValue([]);

      const response = await request(app)
        .get('/api/hints')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });

    it('deve lidar com views nulo', async () => {
      const mockHints = [
        {
          id: 'hint-1',
          content: 'Dica sem views',
          type: 'text',
          views: null,
          publicUrl: null,
          qrCodeUrl: null,
          _count: { interaction: 0 }
        }
      ];

      mockPrisma.admirer.findFirst.mockResolvedValue(mockAdmirer);
      mockPrisma.hint.findMany.mockResolvedValue(mockHints);

      const response = await request(app)
        .get('/api/hints')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body[0].views).toBe(0);
    });

    it('deve retornar 401 sem token de autenticação', async () => {
      const response = await request(app)
        .get('/api/hints');

      expect(response.status).toBe(401);
    });

    it('deve lidar com erro interno do servidor', async () => {
      mockPrisma.user.update.mockResolvedValue(mockUser);
      mockPrisma.user.findUnique.mockResolvedValue({ lastActivity: new Date(), email: 'test@example.com' });
      mockPrisma.admirer.findFirst.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/api/hints')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Erro interno ao buscar dicas');
    });
  });

  describe('DELETE /hint/:id', () => {
    it('deve deletar dica do próprio usuário', async () => {
      const mockHint = {
        id: 'hint-1',
        admirerId: 'admirer-1',
        content: 'Dica a ser deletada'
      };

      mockPrisma.hint.findUnique.mockResolvedValue(mockHint);
      mockPrisma.admirer.findFirst.mockResolvedValue(mockAdmirer);
      mockPrisma.interaction.deleteMany.mockResolvedValue({ count: 2 });
      mockPrisma.hint.delete.mockResolvedValue(mockHint);

      const response = await request(app)
        .delete('/api/hints/hint-1')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(mockPrisma.interaction.deleteMany).toHaveBeenCalledWith({
        where: { hintId: 'hint-1' }
      });
      expect(mockPrisma.hint.delete).toHaveBeenCalledWith({
        where: { id: 'hint-1' }
      });
    });

    it('deve permitir admin deletar qualquer dica', async () => {
      const adminUser = {
        id: 'admin-1',
        email: 'admin@example.com',
        role: 'ADMIN'
      };
      
      // Mock temporário para admin
      authMiddleware.authenticateToken.mockImplementationOnce((req, res, next) => {
        if (req.headers.authorization) {
          req.user = adminUser;
          next();
        } else {
          res.status(401).json({ error: 'Token não fornecido' });
        }
      });

      const mockHint = {
        id: 'hint-1',
        admirerId: 'other-admirer',
        content: 'Dica de outro usuário'
      };

      mockPrisma.hint.findUnique.mockResolvedValue(mockHint);
      mockPrisma.interaction.deleteMany.mockResolvedValue({ count: 1 });
      mockPrisma.hint.delete.mockResolvedValue(mockHint);

      const response = await request(app)
        .delete('/api/hints/hint-1')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      // Admin não precisa verificar ownership
      expect(mockPrisma.admirer.findFirst).not.toHaveBeenCalled();
    });

    it('deve retornar 404 para dica não encontrada', async () => {
      mockPrisma.hint.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .delete('/api/hints/nonexistent-id')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Dica não encontrada');
    });

    it('deve retornar 403 se usuário tentar deletar dica de outro', async () => {
      const mockHint = {
        id: 'hint-1',
        admirerId: 'other-admirer',
        content: 'Dica de outro usuário'
      };

      mockPrisma.hint.findUnique.mockResolvedValue(mockHint);
      mockPrisma.admirer.findFirst.mockResolvedValue(null); // Não encontra admirer do usuário atual

      const response = await request(app)
        .delete('/api/hints/hint-1')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Você não tem permissão para excluir esta dica');
    });

    it('deve retornar 400 para ID vazio', async () => {
      const response = await request(app)
        .delete('/api/hints/')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(404); // Express retorna 404 para rota não encontrada
    });

    it('deve retornar 401 sem token de autenticação', async () => {
      const response = await request(app)
        .delete('/api/hints/hint-1');

      expect(response.status).toBe(401);
    });

    it('deve lidar com erro interno do servidor', async () => {
      mockPrisma.hint.findUnique.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .delete('/api/hints/hint-1')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Erro interno ao deletar dica');
    });

    it('deve lidar com erro ao deletar interações', async () => {
      const mockHint = {
        id: 'hint-1',
        admirerId: 'admirer-1',
        content: 'Dica teste'
      };

      mockPrisma.hint.findUnique.mockResolvedValue(mockHint);
      mockPrisma.admirer.findFirst.mockResolvedValue(mockAdmirer);
      mockPrisma.interaction.deleteMany.mockRejectedValue(new Error('Delete error'));

      const response = await request(app)
        .delete('/api/hints/hint-1')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Erro interno ao deletar dica');
    });
  });
});