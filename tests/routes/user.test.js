// tests/routes/user.test.js
const request = require('supertest');

// Mock do Prisma
const mockPrisma = global.mockPrisma;

// Mock específico para o módulo prisma
jest.mock('../../lib/prisma', () => mockPrisma);

const app = require('../../index');

describe('User Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /search', () => {
    it('deve buscar usuários por nome', async () => {
      const mockUsers = [
        {
          id: 'user-1',
          name: 'João Silva',
          email: 'joao@example.com'
        },
        {
          id: 'user-2',
          name: 'João Santos',
          email: 'joao.santos@example.com'
        }
      ];

      mockPrisma.user.findMany.mockResolvedValue(mockUsers);

      const response = await request(app)
        .get('/api/users/search')
        .query({ name: 'João' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);
      expect(response.body[0].name).toBe('João Silva');
      expect(response.body[1].name).toBe('João Santos');
      expect(mockPrisma.user.findMany).toHaveBeenCalledWith({
        where: {
          name: {
            contains: 'João'
          }
        },
        select: {
          id: true,
          name: true,
          email: true
        },
        take: 20
      });
    });

    it('deve retornar array vazio quando não encontrar usuários', async () => {
      mockPrisma.user.findMany.mockResolvedValue([]);

      const response = await request(app)
        .get('/api/users/search')
        .query({ name: 'UsuarioInexistente' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(0);
    });

    it('deve sanitizar o parâmetro de busca', async () => {
      const mockUsers = [
        {
          id: 'user-1',
          name: 'Maria Silva',
          email: 'maria@example.com'
        }
      ];

      mockPrisma.user.findMany.mockResolvedValue(mockUsers);

      const response = await request(app)
        .get('/api/users/search')
        .query({ name: '  Maria  ' }); // Com espaços

      expect(response.status).toBe(200);
      expect(mockPrisma.user.findMany).toHaveBeenCalledWith({
        where: {
          name: {
            contains: 'Maria' // Sem espaços
          }
        },
        select: {
          id: true,
          name: true,
          email: true
        },
        take: 20
      });
    });

    it('deve retornar 400 para nome inválido', async () => {
      const response = await request(app)
        .get('/api/users/search')
        .query({ name: '' }); // Nome vazio

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('deve retornar 400 para nome muito curto', async () => {
      const response = await request(app)
        .get('/api/users/search')
        .query({ name: 'A' }); // Apenas 1 caractere

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Nome deve ter pelo menos 2 caracteres');
    });

    it('deve retornar 400 para nome muito longo', async () => {
      const longName = 'A'.repeat(51); // 51 caracteres

      const response = await request(app)
        .get('/api/users/search')
        .query({ name: longName });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Nome muito longo para busca');
    });

    it('deve aceitar nome com exatamente 2 caracteres', async () => {
      const mockUsers = [
        {
          id: 'user-1',
          name: 'Al Silva',
          email: 'al@example.com'
        }
      ];

      mockPrisma.user.findMany.mockResolvedValue(mockUsers);

      const response = await request(app)
        .get('/api/users/search')
        .query({ name: 'Al' }); // Exatamente 2 caracteres

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
    });

    it('deve aceitar nome com exatamente 50 caracteres', async () => {
      const exactName = 'A'.repeat(50); // Exatamente 50 caracteres
      const mockUsers = [
        {
          id: 'user-1',
          name: exactName,
          email: 'user@example.com'
        }
      ];

      mockPrisma.user.findMany.mockResolvedValue(mockUsers);

      const response = await request(app)
        .get('/api/users/search')
        .query({ name: exactName });

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
    });

    it('deve limitar resultados a 20 usuários', async () => {
      const mockUsers = Array.from({ length: 25 }, (_, i) => ({
        id: `user-${i + 1}`,
        name: `Usuário ${i + 1}`,
        email: `user${i + 1}@example.com`
      }));

      mockPrisma.user.findMany.mockResolvedValue(mockUsers.slice(0, 20));

      const response = await request(app)
        .get('/api/users/search')
        .query({ name: 'Usuário' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(20);
      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 20
        })
      );
    });

    it('deve fazer busca case-insensitive', async () => {
      const mockUsers = [
        {
          id: 'user-1',
          name: 'JOÃO SILVA',
          email: 'joao@example.com'
        }
      ];

      mockPrisma.user.findMany.mockResolvedValue(mockUsers);

      const response = await request(app)
        .get('/api/users/search')
        .query({ name: 'joão' }); // Minúsculo

      expect(response.status).toBe(200);
      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            name: {
              contains: 'joão'
            }
          }
        })
      );
    });

    it('deve retornar apenas campos específicos do usuário', async () => {
      const mockUsers = [
        {
          id: 'user-1',
          name: 'João Silva',
          email: 'joao@example.com'
          // Não deve incluir password, cpf, etc.
        }
      ];

      mockPrisma.user.findMany.mockResolvedValue(mockUsers);

      const response = await request(app)
        .get('/api/users/search')
        .query({ name: 'João' });

      expect(response.status).toBe(200);
      expect(response.body[0]).toHaveProperty('id');
      expect(response.body[0]).toHaveProperty('name');
      expect(response.body[0]).toHaveProperty('email');
      expect(response.body[0]).not.toHaveProperty('password');
      expect(response.body[0]).not.toHaveProperty('cpf');
      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          select: {
            id: true,
            name: true,
            email: true
          }
        })
      );
    });

    it('deve lidar com erro interno do servidor', async () => {
      mockPrisma.user.findMany.mockRejectedValue(new Error('Database connection failed'));

      const response = await request(app)
        .get('/api/users/search')
        .query({ name: 'João' });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Internal server error');
      expect(response.body.details).toBe('Database connection failed');
    });

    it('deve fazer log de auditoria da busca', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const mockUsers = [
        {
          id: 'user-1',
          name: 'João Silva',
          email: 'joao@example.com'
        }
      ];

      mockPrisma.user.findMany.mockResolvedValue(mockUsers);

      await request(app)
        .get('/api/users/search')
        .query({ name: 'João' });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[AUDIT] Busca de usuário: Query=João')
      );

      consoleSpy.mockRestore();
    });

    it('deve fazer log dos resultados encontrados', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const mockUsers = [
        {
          id: 'user-1',
          name: 'João Silva',
          email: 'joao@example.com'
        }
      ];

      mockPrisma.user.findMany.mockResolvedValue(mockUsers);

      await request(app)
        .get('/api/users/search')
        .query({ name: 'João' });

      expect(consoleSpy).toHaveBeenCalledWith(
        '[USER SEARCH] Found users:',
        mockUsers
      );

      consoleSpy.mockRestore();
    });

    it('deve fazer log de erro em caso de falha', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const error = new Error('Database error');

      mockPrisma.user.findMany.mockRejectedValue(error);

      await request(app)
        .get('/api/users/search')
        .query({ name: 'João' });

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[USER SEARCH] Error searching users:',
        error
      );

      consoleErrorSpy.mockRestore();
    });

    it('deve lidar com parâmetro name ausente', async () => {
      const response = await request(app)
        .get('/api/users/search'); // Sem query parameter

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('deve lidar com caracteres especiais no nome', async () => {
      const mockUsers = [
        {
          id: 'user-1',
          name: 'José María',
          email: 'jose@example.com'
        }
      ];

      mockPrisma.user.findMany.mockResolvedValue(mockUsers);

      const response = await request(app)
        .get('/api/users/search')
        .query({ name: 'José María' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0].name).toBe('José María');
    });
  });
});