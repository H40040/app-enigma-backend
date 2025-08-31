// tests/middleware/authMiddleware.test.js
const jwt = require('jsonwebtoken');
const { authenticateToken, trackUserActivity, checkSessionActivity } = require('../../middleware/authMiddleware');
const prisma = require('../../lib/prisma');

jest.mock('jsonwebtoken');
jest.mock('../../lib/prisma', () => ({
  user: {
    update: jest.fn(),
    findUnique: jest.fn()
  }
}));

describe('AuthMiddleware', () => {
  let req, res, next;

  beforeEach(() => {
    // Configurar JWT_SECRET para os testes
    process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
    
    req = {
      headers: {},
      cookies: {},
      ip: '127.0.0.1',
      originalUrl: '/test'
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    next = jest.fn();
  });

  afterEach(() => {
    // Limpar mocks
    jest.clearAllMocks();
  });

  describe('authenticateToken', () => {
    it('deve retornar 401 se não houver token', () => {
      jwt.verify.mockClear();
      
      authenticateToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Token de acesso requerido'
      });
      expect(next).not.toHaveBeenCalled();
      expect(jwt.verify).not.toHaveBeenCalled();
    });

    it('deve retornar 401 se o token for inválido', () => {
      req.headers['authorization'] = 'Bearer invalid-token';
      jwt.verify.mockImplementation((token, secret, callback) => {
        const error = new Error('invalid token');
        error.name = 'JsonWebTokenError';
        callback(error, null);
      });

      authenticateToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Token inválido' });
      expect(next).not.toHaveBeenCalled();
    });

    it('deve retornar 401 se o token estiver expirado', () => {
      req.headers['authorization'] = 'Bearer expired-token';
      jwt.verify.mockImplementation((token, secret, callback) => {
        const error = new Error('Token expirado');
        error.name = 'TokenExpiredError';
        callback(error, null);
      });

      authenticateToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Token expirado' });
    expect(next).not.toHaveBeenCalled();
  });

  it('deve rejeitar token com payload inválido', () => {
    req.headers.authorization = 'Bearer valid-token';
    jwt.verify.mockImplementation((token, secret, callback) => {
      callback(null, { id: null }); // payload inválido
    });

    authenticateToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
     expect(res.json).toHaveBeenCalledWith({ error: 'Token inválido' });
    expect(next).not.toHaveBeenCalled();
  });

  it('deve rejeitar token muito longo', () => {
    req.headers.authorization = 'Bearer ' + 'a'.repeat(1001);

    authenticateToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
     expect(res.json).toHaveBeenCalledWith({ error: 'Token inválido' });
    expect(next).not.toHaveBeenCalled();
  });

  it('deve lidar com erro de autenticação genérico', () => {
    req.headers.authorization = 'Bearer valid-token';
    const error = new Error('Generic error');
    error.name = 'GenericError';
    jwt.verify.mockImplementation((token, secret, callback) => {
      callback(error);
    });

    authenticateToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Falha na autenticação' });
    expect(next).not.toHaveBeenCalled();
  });
});

describe('trackUserActivity', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      user: { id: '1', email: 'test@example.com' },
      method: 'GET',
      originalUrl: '/test',
      ip: '127.0.0.1'
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    next = jest.fn();
    jest.clearAllMocks();
  });

  it('deve atualizar atividade do usuário com sucesso', async () => {
    prisma.user.update.mockResolvedValue({});

    await trackUserActivity(req, res, next);

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { lastActivity: expect.any(Date) }
    });
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('deve rejeitar ID de usuário inválido', async () => {
    req.user.id = 'invalid';

    await trackUserActivity(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
     expect(res.json).toHaveBeenCalledWith({ error: 'Token inválido' });
    expect(next).not.toHaveBeenCalled();
  });

  it('deve lidar com usuário não encontrado', async () => {
    const error = new Error('User not found');
    error.code = 'P2025';
    prisma.user.update.mockRejectedValue(error);

    await trackUserActivity(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Usuário não encontrado' });
    expect(next).not.toHaveBeenCalled();
  });

  it('deve continuar sem usuário na requisição', async () => {
    req.user = null;

    await trackUserActivity(req, res, next);

    expect(prisma.user.update).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalled();
  });
});

describe('checkSessionActivity', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      user: { id: '550e8400-e29b-41d4-a716-446655440000', email: 'test@example.com' }
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    next = jest.fn();
    jest.clearAllMocks();
  });

  it('deve permitir sessão ativa', async () => {
    const recentActivity = new Date(Date.now() - 30 * 60 * 1000); // 30 minutos atrás
    prisma.user.findUnique.mockResolvedValue({
      lastActivity: recentActivity,
      email: 'test@example.com'
    });

    await checkSessionActivity(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('deve rejeitar sessão expirada', async () => {
    const oldActivity = new Date(Date.now() - 25 * 60 * 60 * 1000); // 25 horas atrás
    prisma.user.findUnique.mockResolvedValue({
      lastActivity: oldActivity,
      email: 'test@example.com'
    });

    await checkSessionActivity(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Sessão expirada por inatividade' });
    expect(next).not.toHaveBeenCalled();
  });

  it('deve rejeitar usuário não encontrado', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    await checkSessionActivity(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Usuário não encontrado' });
     expect(next).not.toHaveBeenCalled();
   });

  it('deve lidar com erro de banco de dados', async () => {
    prisma.user.findUnique.mockRejectedValue(new Error('Database error'));

    await checkSessionActivity(req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Erro interno do servidor' });
    expect(next).not.toHaveBeenCalled();
  });

  it('deve continuar sem usuário na requisição', async () => {
    req.user = null;

    await checkSessionActivity(req, res, next);

    expect(prisma.user.findUnique).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalled();
   });
 });
});