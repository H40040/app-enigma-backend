// tests/routes/auth.simple.test.js
const request = require('supertest');

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

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// Importar o app DEPOIS dos mocks
const app = require('../../index');

describe('Auth Routes - Simple Test', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deve carregar o aplicativo sem erros', () => {
    expect(app).toBeDefined();
    expect(typeof app).toBe('function');
  });

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
  }, 5000); // timeout de 5 segundos
});