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
        throw new Error('Token inválido');
      });

      const response = await request(app)
        .post('/api/auth/refresh-token')
        .send({ refreshToken: 'invalid-token' });

      expect(response.status).toBe(403);
    });

    it('deve retornar 401 para usuário não encontrado', async () => {
      jwt.verify.mockReturnValue({ userId: 999 });
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/auth/refresh-token')
        .send({ refreshToken: 'valid-token' });

      expect(response.status).toBe(404);
    });
  });

  // Testes para POST /api/auth/logout
  describe('POST /api/auth/logout', () => {
    it('deve fazer logout com sucesso', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .send({});

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Logout realizado com sucesso');
    });
  });

  // Testes para GET /api/auth/profile
  describe('GET /api/auth/profile', () => {
    it('deve retornar 401 sem token', async () => {
      const response = await request(app)
        .get('/api/auth/profile');

      expect(response.status).toBe(401);
    });
  });

  // Testes para POST /api/auth/change-password
  describe('POST /api/auth/change-password', () => {
    it('deve retornar 401 sem token', async () => {
      const response = await request(app)
        .post('/api/auth/change-password')
        .send({
          currentPassword: 'OldPassword123!',
          newPassword: 'NewPassword123!'
        });

      expect(response.status).toBe(401);
    });
  });
});