// tests/routes/register.test.js
const request = require('supertest');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const app = require('../../index');

// Mock do Prisma
const mockPrisma = global.mockPrisma;

// Mock do módulo prisma
jest.mock('../../lib/prisma', () => global.mockPrisma);

// Mock do bcrypt
jest.mock('bcrypt');

// Mock do JWT
jest.mock('jsonwebtoken');

describe('Register Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /register', () => {
    const validUserData = {
      email: 'novo@example.com',
      password: 'ValidPassword123!',
      name: 'João Silva',
      birthdate: '1990-01-01',
      cpf: '12345678909',
      whatsapp: '11987654321'
    };

    it('deve registrar usuário com dados válidos', async () => {
      const mockUser = {
        id: 1,
        name: 'João Silva',
        email: 'novo@example.com',
        isAdmin: false,
        createdAt: new Date()
      };

      mockPrisma.user.findUnique.mockResolvedValue(null); // Email não existe
      mockPrisma.user.findFirst.mockResolvedValue(null); // CPF não existe
      bcrypt.hash.mockResolvedValue('hashedPassword');
      mockPrisma.user.create.mockResolvedValue(mockUser);
      jwt.sign.mockReturnValue('mock-token');
      mockPrisma.message.updateMany.mockResolvedValue({ count: 0 });

      const response = await request(app)
        .post('/api/register')
        .send(validUserData);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
      expect(response.body.id).toBe(mockUser.id);
      expect(response.body.name).toBe(mockUser.name);
      expect(response.body.email).toBe(mockUser.email);
      expect(response.body).not.toHaveProperty('password');
    });

    it('deve registrar usuário sem WhatsApp (campo opcional)', async () => {
      const userDataWithoutWhatsapp = { ...validUserData };
      delete userDataWithoutWhatsapp.whatsapp;

      const mockUser = {
        id: 1,
        name: 'João Silva',
        email: 'novo@example.com',
        isAdmin: false,
        createdAt: new Date()
      };

      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.findFirst.mockResolvedValue(null);
      bcrypt.hash.mockResolvedValue('hashedPassword');
      mockPrisma.user.create.mockResolvedValue(mockUser);
      jwt.sign.mockReturnValue('mock-token');
      mockPrisma.message.updateMany.mockResolvedValue({ count: 0 });

      const response = await request(app)
        .post('/api/register')
        .send(userDataWithoutWhatsapp);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
    });

    it('deve retornar 400 para email inválido', async () => {
      const invalidData = { ...validUserData, email: 'invalid-email' };

      const response = await request(app)
        .post('/api/register')
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('email');
    });

    it('deve retornar 400 para senha inválida', async () => {
      const invalidData = { ...validUserData, password: 'weak' };

      const response = await request(app)
        .post('/api/register')
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Senha');
    });

    it('deve retornar 400 para nome inválido', async () => {
      const invalidData = { ...validUserData, name: 'A' };

      const response = await request(app)
        .post('/api/register')
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Nome');
    });

    it('deve retornar 400 para data de nascimento inválida', async () => {
      const invalidData = { ...validUserData, birthdate: 'invalid-date' };

      const response = await request(app)
        .post('/api/register')
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Data de nascimento');
    });

    it('deve retornar 400 para CPF inválido', async () => {
      const invalidData = { ...validUserData, cpf: '123' };

      const response = await request(app)
        .post('/api/register')
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('CPF');
    });

    it('deve retornar 400 para WhatsApp inválido', async () => {
      const invalidData = { ...validUserData, whatsapp: '123' };

      const response = await request(app)
        .post('/api/register')
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Telefone');
    });

    it('deve retornar 409 para email já existente', async () => {
      const existingUser = {
        id: 1,
        email: 'novo@example.com'
      };

      mockPrisma.user.findUnique.mockResolvedValue(existingUser);

      const response = await request(app)
        .post('/api/register')
        .send(validUserData);

      expect(response.status).toBe(409);
      expect(response.body.error).toBe('Usuário já existe');
    });

    it('deve retornar 409 para CPF já existente', async () => {
      const existingUser = {
        id: 1,
        cpf: '12345678909'
      };

      mockPrisma.user.findUnique.mockResolvedValue(null); // Email não existe
      mockPrisma.user.findFirst.mockResolvedValue(existingUser); // CPF existe

      const response = await request(app)
        .post('/api/register')
        .send(validUserData);

      expect(response.status).toBe(409);
      expect(response.body.error).toBe('CPF já cadastrado');
    });

    it('deve vincular mensagens pendentes ao novo usuário', async () => {
      const mockUser = {
        id: 1,
        name: 'João Silva',
        email: 'novo@example.com',
        isAdmin: false,
        createdAt: new Date()
      };

      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.findFirst.mockResolvedValue(null);
      bcrypt.hash.mockResolvedValue('hashedPassword');
      mockPrisma.user.create.mockResolvedValue(mockUser);
      jwt.sign.mockReturnValue('mock-token');
      mockPrisma.message.updateMany.mockResolvedValue({ count: 3 });

      const response = await request(app)
        .post('/api/register')
        .send(validUserData);

      expect(response.status).toBe(200);
      expect(mockPrisma.message.updateMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { recipientEmail: 'novo@example.com' },
            { recipientPhone: '12345678909' },
            { recipientUsername: 'João Silva' }
          ],
          recipientId: null
        },
        data: { recipientId: 1 }
      });
    });

    it('deve usar salt alto para hash da senha', async () => {
      const mockUser = {
        id: 1,
        name: 'João Silva',
        email: 'novo@example.com',
        isAdmin: false,
        createdAt: new Date()
      };

      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.findFirst.mockResolvedValue(null);
      bcrypt.hash.mockResolvedValue('hashedPassword');
      mockPrisma.user.create.mockResolvedValue(mockUser);
      jwt.sign.mockReturnValue('mock-token');
      mockPrisma.message.updateMany.mockResolvedValue({ count: 0 });

      await request(app)
        .post('/api/register')
        .send(validUserData);

      expect(bcrypt.hash).toHaveBeenCalledWith('ValidPassword123!', 12);
    });

    it('deve gerar token JWT após registro', async () => {
      const mockUser = {
        id: 1,
        name: 'João Silva',
        email: 'novo@example.com',
        isAdmin: false,
        createdAt: new Date()
      };

      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.findFirst.mockResolvedValue(null);
      bcrypt.hash.mockResolvedValue('hashedPassword');
      mockPrisma.user.create.mockResolvedValue(mockUser);
      jwt.sign.mockReturnValue('mock-token');
      mockPrisma.message.updateMany.mockResolvedValue({ count: 0 });

      await request(app)
        .post('/api/register')
        .send(validUserData);

      expect(jwt.sign).toHaveBeenCalledWith(
        { id: 1, name: 'João Silva', email: 'novo@example.com' },
        process.env.JWT_SECRET,
        { expiresIn: process.env.TOKEN_EXPIRATION || '1h' }
      );
    });

    it('deve lidar com erro interno do servidor', async () => {
      mockPrisma.user.findUnique.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .post('/api/register')
        .send(validUserData);

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Erro ao registrar usuário');
    });

    it('deve sanitizar dados de entrada', async () => {
      const dataWithSpaces = {
        ...validUserData,
        email: '  novo@example.com  ',
        name: '  João Silva  '
      };

      const mockUser = {
        id: 1,
        name: 'João Silva',
        email: 'novo@example.com',
        isAdmin: false,
        createdAt: new Date()
      };

      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.findFirst.mockResolvedValue(null);
      bcrypt.hash.mockResolvedValue('hashedPassword');
      mockPrisma.user.create.mockResolvedValue(mockUser);
      jwt.sign.mockReturnValue('mock-token');
      mockPrisma.message.updateMany.mockResolvedValue({ count: 0 });

      const response = await request(app)
        .post('/api/register')
        .send(dataWithSpaces);

      expect(response.status).toBe(200);
      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          email: 'novo@example.com', // Sem espaços
          name: 'João Silva' // Sem espaços
        })
      });
    });

    it('deve retornar dados do usuário sem senha', async () => {
      const mockUser = {
        id: 1,
        name: 'João Silva',
        email: 'novo@example.com',
        password: 'hashedPassword', // Não deve aparecer na resposta
        isAdmin: false,
        createdAt: new Date()
      };

      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.findFirst.mockResolvedValue(null);
      bcrypt.hash.mockResolvedValue('hashedPassword');
      mockPrisma.user.create.mockResolvedValue(mockUser);
      jwt.sign.mockReturnValue('mock-token');
      mockPrisma.message.updateMany.mockResolvedValue({ count: 0 });

      const response = await request(app)
        .post('/api/register')
        .send(validUserData);

      expect(response.status).toBe(200);
      expect(response.body).not.toHaveProperty('password');
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('name');
      expect(response.body).toHaveProperty('email');
      expect(response.body).toHaveProperty('isAdmin');
      expect(response.body).toHaveProperty('createdAt');
      expect(response.body).toHaveProperty('token');
    });
  });
});