// tests/setup.js
const { PrismaClient } = require('@prisma/client');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.test') });

// Mock do Prisma para testes
const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
    count: jest.fn()
  },
  admirer: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
    count: jest.fn()
  },
  hint: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
    count: jest.fn()
  },
  message: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
    count: jest.fn()
  },
  reply: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
    count: jest.fn()
  },
  interaction: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
    count: jest.fn()
  },
  $disconnect: jest.fn(),
  $queryRaw: jest.fn() // Adicionado mock para $queryRaw
};

// Mock global do Prisma
jest.mock('../lib/prisma.js', () => ({
  __esModule: true,
  default: mockPrisma
}));

// Mock do middleware de autenticação removido - cada teste deve fazer seu próprio mock

// Configurações globais para testes
global.mockPrisma = mockPrisma;

// Configurar variáveis de ambiente para teste
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
process.env.DATABASE_URL = 'file:./test.db';

// Limpar mocks antes de cada teste
beforeEach(() => {
  jest.clearAllMocks();
});

// Configurar timeout global
jest.setTimeout(30000);

// Suprimir logs durante os testes - COMENTADO PARA DEBUG
// const originalConsole = console;
// beforeAll(() => {
//   console.log = jest.fn();
//   console.error = jest.fn();
//   console.warn = jest.fn();
// });

// afterAll(() => {
//   console.log = originalConsole.log;
//   console.error = originalConsole.error;
//   console.warn = originalConsole.warn;
// });