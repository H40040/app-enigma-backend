// tests/routes/auth.test.js
const request = require('supertest');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

// Mock do Prisma
const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn()
  }
};

// Mock do módulo prisma ANTES de importar o app
jest.mock('../../lib/prisma', () => mockPrisma);

// Mock do bcrypt
jest.mock('bcrypt', () => ({
  compare: jest.fn(),
  hash: jest.fn()
}));

// Mock do JWT
jest.mock('jsonwebtoken', () => ({
  sign: jest.fn(),
  verify: jest.fn()
}));

// Mock do authMiddleware
const mockAuthMiddleware = {
  authenticateToken: jest.fn((req, res, next) => {
    req.user = { id: 1 };
    next();
  }),
  trackUserActivity: jest.fn((req, res, next) => {
    next();
  }),
  checkSessionActivity: jest.fn((req, res, next) => {
    next();
  })
};
jest.mock('../../middleware/authMiddleware', () => mockAuthMiddleware);

// Importar o app DEPOIS dos mocks
const app = require('../../index');

describe('Auth Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Teste básico
  it('deve carregar o aplicativo sem erros', () => {
    expect(app).toBeDefined();
    expect(typeof app).toBe('function');
  });

  // Testes para POST /api/auth/verify-user
  describe('POST /api/auth/verify-user', () => {
    it('deve fazer login com credenciais válidas', async () => {
      const mockUser = {
        id: 1,
        name: 'João Silva',
        email: 'joao@example.com',
        password: 'hashedPassword'
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      bcrypt.compare.mockResolvedValue(true);
      jwt.sign.mockReturnValue('mock-token');

      const response = await request(app)
        .post('/api/auth/verify-user')
        .send({
          email: 'joao@example.com',
          password: 'ValidPassword123!'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
    });

    it('deve retornar 400 para email inválido', async () => {
      const response = await request(app)
        .post('/api/auth/verify-user')
        .send({
          email: 'email-invalido',
          password: 'ValidPassword123!'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('deve retornar 401 para senha inválida', async () => {
      // Mock do usuário existente
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 1,
        email: 'joao@example.com',
        password: 'hashedpassword'
      });
      
      // Mock do bcrypt retornando false (senha incorreta)
      const bcrypt = require('bcrypt');
      bcrypt.compare.mockResolvedValue(false);
      
      const response = await request(app)
        .post('/api/auth/verify-user')
        .send({
          email: 'joao@example.com',
          password: 'senhaerrada'
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });

    it('deve retornar 401 para usuário não encontrado', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/auth/verify-user')
        .send({
          email: 'nonexistent@example.com',
          password: 'ValidPassword123!'
        });

      expect(response.status).toBe(401);
    });

    it('deve retornar 401 para senha incorreta', async () => {
      const mockUser = {
        id: 1,
        name: 'João Silva',
        email: 'joao@example.com',
        password: 'hashedPassword'
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      bcrypt.compare.mockResolvedValue(false);

      const response = await request(app)
        .post('/api/auth/verify-user')
        .send({
          email: 'joao@example.com',
          password: 'WrongPassword123!'
        });

      expect(response.status).toBe(401);
    });
  });

  // Testes para POST /api/auth/refresh-token
  describe('POST /api/auth/refresh-token', () => {
    it('deve retornar 401 sem token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh-token')
        .send({});

      expect(response.status).toBe(401);
    });

    it('deve retornar 401 para token inválido', async () => {
      jwt.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const response = await request(app)
        .post('/api/auth/refresh-token')
        .send({ refreshToken: 'invalid-token' });

      expect(response.status).toBe(403);
    });

    it('deve renovar tokens com sucesso', async () => {
      const mockUser = {
        id: 1,
        name: 'João Silva',
        email: 'joao@example.com'
      };

      jwt.verify.mockReturnValue({ id: 1 });
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      jwt.sign.mockReturnValue('new-token');

      const response = await request(app)
        .post('/api/auth/refresh-token')
        .send({ refreshToken: 'valid-refresh-token' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
    });

    it('deve retornar 404 para usuário não encontrado no refresh', async () => {
      jwt.verify.mockReturnValue({ id: 999 });
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/auth/refresh-token')
        .send({ refreshToken: 'valid-refresh-token' });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Usuário não encontrado');
    });
  });

  // Testes para GET /api/auth/profile
  describe('GET /api/auth/profile', () => {
    it('deve retornar perfil do usuário autenticado', async () => {
      const mockUser = {
        id: 1,
        name: 'João Silva',
        email: 'joao@example.com',
        isAdmin: false,
        createdAt: new Date()
      };

      // Mock do middleware de autenticação
      // Mock já configurado globalmente
      mockAuthMiddleware.authenticateToken.mockImplementation((req, res, next) => {
        req.user = { id: 1 };
        next();
      });
      mockAuthMiddleware.checkSessionActivity.mockImplementation((req, res, next) => next());
      mockAuthMiddleware.trackUserActivity.mockImplementation((req, res, next) => next());

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body.user).toHaveProperty('id');
      expect(response.body.user).toHaveProperty('name');
      expect(response.body.user).not.toHaveProperty('password');
    });

    it('deve retornar 404 para usuário não encontrado no profile', async () => {
      const mockAuthMiddleware = require('../../middleware/authMiddleware');
      mockAuthMiddleware.authenticateToken.mockImplementation((req, res, next) => {
        req.user = { id: 999 };
        next();
      });
      mockAuthMiddleware.checkSessionActivity.mockImplementation((req, res, next) => next());
      mockAuthMiddleware.trackUserActivity.mockImplementation((req, res, next) => next());

      mockPrisma.user.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(404);
    });
  });

  // Testes para POST /api/auth/logout
  describe('POST /api/auth/logout', () => {
    it('deve fazer logout com sucesso', async () => {
      const response = await request(app)
        .post('/api/auth/logout');

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Logout realizado com sucesso');
    });
  });

  // Testes para POST /api/auth/change-password
  describe('POST /api/auth/change-password', () => {
    it('deve retornar 400 se senha atual estiver incorreta', async () => {
      // Mock já configurado globalmente
      mockAuthMiddleware.authenticateToken.mockImplementation((req, res, next) => {
        req.user = { id: 1 };
        next();
      });
      mockAuthMiddleware.checkSessionActivity.mockImplementation((req, res, next) => next());
      mockAuthMiddleware.trackUserActivity.mockImplementation((req, res, next) => next());

      const response = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', 'Bearer valid-token')
        .send({}); // Sem campos obrigatórios

      expect(response.status).toBe(400);
    });

    it('deve retornar 404 se usuário não encontrado', async () => {
      // Mock já configurado globalmente
      mockAuthMiddleware.authenticateToken.mockImplementation((req, res, next) => {
        req.user = { id: 999 };
        next();
      });
      mockAuthMiddleware.checkSessionActivity.mockImplementation((req, res, next) => next());
      mockAuthMiddleware.trackUserActivity.mockImplementation((req, res, next) => next());

      mockPrisma.user.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', 'Bearer valid-token')
        .send({
          currentPassword: 'SenhaAtual123!',
          newPassword: 'NovaSenha123!'
        });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Usuário não encontrado');
    });

    it('deve retornar 400 para senha atual incorreta', async () => {
      const mockUser = {
        id: 1,
        password: 'hashedPassword'
      };

      // Mock já configurado globalmente
      mockAuthMiddleware.authenticateToken.mockImplementation((req, res, next) => {
        req.user = { id: 1 };
        next();
      });

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      bcrypt.compare.mockResolvedValue(false); // Senha incorreta

      const response = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', 'Bearer valid-token')
        .send({
          currentPassword: 'senhaErrada',
          newPassword: 'NovaSenha123!'
        });
      
      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Senha atual incorreta');
    });

    it('deve alterar senha com sucesso', async () => {
      const mockUser = {
        id: 1,
        password: 'hashedPassword'
      };

      // Mock já configurado globalmente
      mockAuthMiddleware.authenticateToken.mockImplementation((req, res, next) => {
        req.user = { id: 1 };
        next();
      });
      mockAuthMiddleware.checkSessionActivity.mockImplementation((req, res, next) => next());
      mockAuthMiddleware.trackUserActivity.mockImplementation((req, res, next) => next());

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      bcrypt.compare
        .mockResolvedValueOnce(true)  // Primeira chamada: senha atual correta
        .mockResolvedValueOnce(false); // Segunda chamada: nova senha é diferente
      bcrypt.hash.mockResolvedValue('newHashedPassword');
      mockPrisma.user.update.mockResolvedValue({ ...mockUser, password: 'newHashedPassword' });

      const response = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', 'Bearer valid-token')
        .send({
          currentPassword: 'SenhaAtual123!',
          newPassword: 'NovaSenha123!'
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Senha alterada com sucesso');
      expect(bcrypt.hash).toHaveBeenCalledWith('NovaSenha123!', 12);
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { password: 'newHashedPassword' }
      });
    });

    it('deve retornar erro 500 em caso de falha no banco de dados', async () => {
      // Mock já configurado globalmente
      mockAuthMiddleware.authenticateToken.mockImplementation((req, res, next) => {
        req.user = { id: 1 };
        next();
      });
      mockAuthMiddleware.checkSessionActivity.mockImplementation((req, res, next) => next());
      mockAuthMiddleware.trackUserActivity.mockImplementation((req, res, next) => next());

      mockPrisma.user.findUnique.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', 'Bearer valid-token')
        .send({
          currentPassword: 'SenhaAtual123!',
          newPassword: 'NovaSenha123!'
        });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Erro interno no servidor ao alterar senha');
    });
  });
});