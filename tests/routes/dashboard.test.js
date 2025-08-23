// tests/routes/dashboard.test.js

// Mock do módulo prisma
jest.mock('../../lib/prisma', () => global.mockPrisma);

// Mock do middleware de autenticação
const mockAuthMiddleware = {
  authenticateToken: jest.fn((req, res, next) => {
    req.user = req.user || { id: 'user-1', email: 'test@example.com', role: 'USER', isAdmin: false };
    next();
  }),
  trackUserActivity: jest.fn((req, res, next) => next()),
  checkSessionActivity: jest.fn((req, res, next) => next())
};

jest.mock('../../middleware/authMiddleware', () => mockAuthMiddleware);

// Mock do JWT
jest.mock('jsonwebtoken');

const request = require('supertest');
const app = require('../../index');
const jwt = require('jsonwebtoken');

// Mock do Prisma
const mockPrisma = global.mockPrisma;

describe('Dashboard Routes', () => {
  let validToken;
  let mockUser;
  let mockAdminUser;
  let mockAdmirer;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockUser = {
      id: 'user-1',
      email: 'test@example.com',
      role: 'USER',
      isAdmin: false
    };

    mockAdminUser = {
      id: 'admin-1',
      email: 'admin@example.com',
      role: 'ADMIN',
      isAdmin: true
    };

    mockAdmirer = {
      id: 'admirer-1',
      email: 'test@example.com',
      userId: 'user-1'
    };

    validToken = 'valid-jwt-token';
    jwt.verify.mockReturnValue(mockUser);
  });

  describe('GET /dashboard', () => {
    it('deve buscar dicas do dashboard com sucesso', async () => {
      const mockHints = [
        {
          id: 'hint-1',
          content: 'Primeira dica',
          admirerId: 'admirer-1',
          createdAt: new Date('2023-01-02'),
          interactions: [
            {
              id: 1,
              content: 'Pergunta 1',
              answer: 'Resposta 1'
            }
          ]
        },
        {
          id: 'hint-2',
          content: 'Segunda dica',
          admirerId: 'admirer-1',
          createdAt: new Date('2023-01-01'),
          interactions: []
        }
      ];

      mockPrisma.admirer.findUnique.mockResolvedValue(mockAdmirer);
      mockPrisma.hint.findMany.mockResolvedValue(mockHints);

      const response = await request(app)
        .get('/api/dashboard')
        .query({ hintsFor: 'test@example.com' })
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);
      expect(response.body[0].content).toBe('Primeira dica');
      expect(response.body[0].interactions).toHaveLength(1);
      expect(response.body[1].interactions).toHaveLength(0);
      
      expect(mockPrisma.hint.findMany).toHaveBeenCalledWith({
        where: { admirerId: 'admirer-1' },
        include: { interactions: true },
        orderBy: { createdAt: 'desc' }
      });
    });

    it('deve retornar array vazio se admirer não existe', async () => {
      mockPrisma.admirer.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/dashboard')
        .query({ hintsFor: 'test@example.com' })
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
      expect(mockPrisma.hint.findMany).not.toHaveBeenCalled();
    });

    it('deve retornar array vazio se não há dicas', async () => {
      mockPrisma.admirer.findUnique.mockResolvedValue(mockAdmirer);
      mockPrisma.hint.findMany.mockResolvedValue([]);

      const response = await request(app)
        .get('/api/dashboard')
        .query({ hintsFor: 'test@example.com' })
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });

    it('deve ordenar dicas por data de criação decrescente', async () => {
      mockPrisma.admirer.findUnique.mockResolvedValue(mockAdmirer);
      mockPrisma.hint.findMany.mockResolvedValue([]);

      await request(app)
        .get('/api/dashboard')
        .query({ hintsFor: 'test@example.com' })
        .set('Authorization', `Bearer ${validToken}`);

      expect(mockPrisma.hint.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: 'desc' }
        })
      );
    });

    it('deve incluir interações nas dicas', async () => {
      mockPrisma.admirer.findUnique.mockResolvedValue(mockAdmirer);
      mockPrisma.hint.findMany.mockResolvedValue([]);

      await request(app)
        .get('/api/dashboard')
        .query({ hintsFor: 'test@example.com' })
        .set('Authorization', `Bearer ${validToken}`);

      expect(mockPrisma.hint.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          include: { interactions: true }
        })
      );
    });

    it('deve permitir acesso para admin a qualquer email', async () => {
      jwt.verify.mockReturnValue(mockAdminUser);
      
      // Configurar o middleware para retornar usuário admin
      mockAuthMiddleware.authenticateToken.mockImplementationOnce((req, res, next) => {
        req.user = mockAdminUser;
        next();
      });
      
      mockPrisma.admirer.findUnique.mockResolvedValue(mockAdmirer);
      mockPrisma.hint.findMany.mockResolvedValue([]);

      const response = await request(app)
        .get('/api/dashboard')
        .query({ hintsFor: 'any@example.com' })
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(mockPrisma.admirer.findUnique).toHaveBeenCalledWith({
        where: { email: 'any@example.com' }
      });
    });

    it('deve retornar 400 se parâmetro hintsFor está ausente', async () => {
      const response = await request(app)
        .get('/api/dashboard')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Parâmetro hintsFor é obrigatório.');
    });

    it('deve retornar 400 se parâmetro hintsFor está vazio', async () => {
      const response = await request(app)
        .get('/api/dashboard')
        .query({ hintsFor: '' })
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Parâmetro hintsFor é obrigatório.');
    });

    it('deve retornar 403 para usuário sem permissão', async () => {
      const response = await request(app)
        .get('/api/dashboard')
        .query({ hintsFor: 'other@example.com' })
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Acesso negado');
    });

    it('deve permitir acesso ao próprio email', async () => {
      mockPrisma.admirer.findUnique.mockResolvedValue(mockAdmirer);
      mockPrisma.hint.findMany.mockResolvedValue([]);

      const response = await request(app)
        .get('/api/dashboard')
        .query({ hintsFor: 'test@example.com' })
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
    });

    it('deve retornar 401 sem token de autenticação', async () => {
      // Configurar o middleware para não autenticar
      mockAuthMiddleware.authenticateToken.mockImplementationOnce((req, res, next) => {
        return res.status(401).json({ error: 'Token não fornecido' });
      });
      
      const response = await request(app)
        .get('/api/dashboard')
        .query({ hintsFor: 'test@example.com' });

      expect(response.status).toBe(401);
    });

    it('deve retornar 401 com token inválido', async () => {
      jwt.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });
      
      // Configurar o middleware para retornar 401 em caso de token inválido
      mockAuthMiddleware.authenticateToken.mockImplementationOnce((req, res, next) => {
        return res.status(401).json({ error: 'Token inválido' });
      });

      const response = await request(app)
        .get('/api/dashboard')
        .query({ hintsFor: 'test@example.com' })
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
    });

    it('deve lidar com erro interno do servidor ao buscar admirer', async () => {
      mockPrisma.admirer.findUnique.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/api/dashboard')
        .query({ hintsFor: 'test@example.com' })
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Erro interno ao buscar dados do painel.');
    });

    it('deve lidar com erro interno do servidor ao buscar hints', async () => {
      mockPrisma.admirer.findUnique.mockResolvedValue(mockAdmirer);
      mockPrisma.hint.findMany.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/api/dashboard')
        .query({ hintsFor: 'test@example.com' })
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Erro interno ao buscar dados do painel.');
    });

    it('deve fazer log de erro em caso de falha', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const error = new Error('Database connection failed');
      
      mockPrisma.admirer.findUnique.mockRejectedValue(error);

      await request(app)
        .get('/api/dashboard')
        .query({ hintsFor: 'test@example.com' })
        .set('Authorization', `Bearer ${validToken}`);

      expect(consoleSpy).toHaveBeenCalledWith('Erro no dashboard:', error);
      
      consoleSpy.mockRestore();
    });

    it('deve buscar admirer pelo email correto', async () => {
      mockPrisma.admirer.findUnique.mockResolvedValue(mockAdmirer);
      mockPrisma.hint.findMany.mockResolvedValue([]);

      await request(app)
        .get('/api/dashboard')
        .query({ hintsFor: 'test@example.com' })
        .set('Authorization', `Bearer ${validToken}`);

      expect(mockPrisma.admirer.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' }
      });
    });

    it('deve buscar hints pelo admirerId correto', async () => {
      const specificAdmirer = {
        id: 'specific-admirer-id',
        email: 'test@example.com'
      };
      
      mockPrisma.admirer.findUnique.mockResolvedValue(specificAdmirer);
      mockPrisma.hint.findMany.mockResolvedValue([]);

      await request(app)
        .get('/api/dashboard')
        .query({ hintsFor: 'test@example.com' })
        .set('Authorization', `Bearer ${validToken}`);

      expect(mockPrisma.hint.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { admirerId: 'specific-admirer-id' }
        })
      );
    });

    it('deve retornar dicas com estrutura correta', async () => {
      const mockHints = [
        {
          id: 'hint-1',
          content: 'Dica teste',
          admirerId: 'admirer-1',
          createdAt: new Date('2023-01-01'),
          type: 'text',
          views: 5,
          interactions: [
            {
              id: 1,
              content: 'Pergunta teste',
              answer: 'Resposta teste',
              createdAt: new Date('2023-01-01'),
              answeredAt: new Date('2023-01-02')
            }
          ]
        }
      ];

      mockPrisma.admirer.findUnique.mockResolvedValue(mockAdmirer);
      mockPrisma.hint.findMany.mockResolvedValue(mockHints);

      const response = await request(app)
        .get('/api/dashboard')
        .query({ hintsFor: 'test@example.com' })
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body[0]).toHaveProperty('id', 'hint-1');
      expect(response.body[0]).toHaveProperty('content', 'Dica teste');
      expect(response.body[0]).toHaveProperty('admirerId', 'admirer-1');
      expect(response.body[0]).toHaveProperty('interactions');
      expect(response.body[0].interactions[0]).toHaveProperty('id', 1);
      expect(response.body[0].interactions[0]).toHaveProperty('content', 'Pergunta teste');
      expect(response.body[0].interactions[0]).toHaveProperty('answer', 'Resposta teste');
    });
  });
});