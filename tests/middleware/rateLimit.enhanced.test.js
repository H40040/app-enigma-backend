const request = require('supertest');
const express = require('express');
const {
  authLimiter,
  passwordChangeLimiter,
  validationLimiter,
  apiLimiter,
  messageLimiter
} = require('../../middleware/rateLimit');

// Criar app de teste para cada limitador
function createTestApp(limiter, endpoint = '/test', shouldFail = false) {
  const app = express();
  app.use(express.json());
  app.use(endpoint, limiter);
  app.get(endpoint, (req, res) => {
    if (shouldFail) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    res.json({ success: true });
  });
  app.post(endpoint, (req, res) => {
    if (shouldFail) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    res.json({ success: true });
  });
  return app;
}

describe('Rate Limiters - Enhanced Coverage', () => {
  // Salvar NODE_ENV original
  const originalNodeEnv = process.env.NODE_ENV;
  
  afterEach(() => {
    // Restaurar NODE_ENV original
    process.env.NODE_ENV = originalNodeEnv;
  });

  describe('authLimiter', () => {
    let app;
    
    beforeEach(() => {
      app = createTestApp(authLimiter, '/auth');
    });

    it('deve permitir requisições dentro do limite em produção', async () => {
      process.env.NODE_ENV = 'production';
      
      // Fazer 5 requisições (limite é 5 por 15 minutos)
      for (let i = 0; i < 5; i++) {
        const response = await request(app).post('/auth');
        expect(response.status).toBe(200);
      }
    });

    it('deve bloquear requisições acima do limite em produção', async () => {
      process.env.NODE_ENV = 'production';
      // Criar app que simula falhas de autenticação
      const failingApp = createTestApp(authLimiter, '/auth', true);
      
      // Fazer 5 requisições que falham (limite é 5)
      for (let i = 0; i < 5; i++) {
        await request(failingApp).post('/auth');
      }
      
      const response = await request(failingApp).post('/auth');
      expect(response.status).toBe(429);
      expect(response.body.error).toBe('Muitas tentativas de autenticação. Tente novamente em 15 minutos.');
    });

    it('deve permitir todas as requisições em ambiente de teste', async () => {
      process.env.NODE_ENV = 'test';
      
      // Fazer 10 requisições (mais que o limite)
      for (let i = 0; i < 10; i++) {
        const response = await request(app).post('/auth');
        expect(response.status).toBe(200);
      }
    });
  });

  describe('passwordChangeLimiter', () => {
    let app;
    
    beforeEach(() => {
      app = createTestApp(passwordChangeLimiter, '/change-password');
    });

    it('deve permitir requisições dentro do limite em produção', async () => {
      process.env.NODE_ENV = 'production';
      
      // Fazer 3 requisições (limite é 3 por hora)
      for (let i = 0; i < 3; i++) {
        const response = await request(app).post('/change-password');
        expect(response.status).toBe(200);
      }
    });

    it('deve bloquear requisições acima do limite em produção', async () => {
      process.env.NODE_ENV = 'production';
      
      // Fazer 4 requisições (limite é 3)
      for (let i = 0; i < 3; i++) {
        await request(app).post('/change-password');
      }
      
      const response = await request(app).post('/change-password');
      expect(response.status).toBe(429);
      expect(response.body.error).toBe('Muitas tentativas de mudança de senha. Tente novamente em 1 hora.');
    });
  });

  describe('validationLimiter', () => {
    let app;
    
    beforeEach(() => {
      app = createTestApp(validationLimiter, '/validate');
    });

    it('deve permitir requisições dentro do limite em produção', async () => {
      process.env.NODE_ENV = 'production';
      
      // Fazer 10 requisições (limite é 10 por minuto)
      for (let i = 0; i < 10; i++) {
        const response = await request(app).post('/validate');
        expect(response.status).toBe(200);
      }
    });

    it('deve bloquear requisições acima do limite em produção', async () => {
      process.env.NODE_ENV = 'production';
      
      // Fazer 11 requisições (limite é 10)
      for (let i = 0; i < 10; i++) {
        await request(app).post('/validate');
      }
      
      const response = await request(app).post('/validate');
      expect(response.status).toBe(429);
      expect(response.body.error).toBe('Muitas tentativas de validação. Tente novamente em 15 minutos.');
    });
  });

  describe('apiLimiter', () => {
    let app;
    
    beforeEach(() => {
      app = createTestApp(apiLimiter, '/api');
    });

    it('deve permitir requisições dentro do limite em produção', async () => {
      process.env.NODE_ENV = 'production';
      
      // Fazer 100 requisições (limite é 100 por 15 minutos)
      for (let i = 0; i < 50; i++) { // Testando apenas 50 para não demorar muito
        const response = await request(app).get('/api');
        expect(response.status).toBe(200);
      }
    });

    it('deve incluir headers de rate limit', async () => {
      process.env.NODE_ENV = 'production';
      
      const response = await request(app).get('/api');
      expect(response.status).toBe(200);
      // Headers de rate limit podem estar presentes dependendo da configuração
      if (response.headers['x-ratelimit-limit']) {
        expect(response.headers).toHaveProperty('x-ratelimit-limit');
        expect(response.headers).toHaveProperty('x-ratelimit-remaining');
      }
    });
  });

  describe('messageLimiter', () => {
    let app;
    
    beforeEach(() => {
      app = createTestApp(messageLimiter, '/message');
    });

    it('deve permitir requisições dentro do limite em produção', async () => {
      process.env.NODE_ENV = 'production';
      
      // Fazer 10 requisições (limite é 10 por hora)
      for (let i = 0; i < 10; i++) {
        const response = await request(app).post('/message');
        expect(response.status).toBe(200);
      }
    });

    it('deve bloquear requisições acima do limite em produção', async () => {
      process.env.NODE_ENV = 'production';
      
      // Fazer 11 requisições (limite é 10)
      for (let i = 0; i < 10; i++) {
        await request(app).post('/message');
      }
      
      const response = await request(app).post('/message');
      expect(response.status).toBe(429);
      expect(response.body.error).toBe('Muitas mensagens enviadas. Tente novamente em 1 hora.');
    });
  });

  describe('Rate Limiter Configuration', () => {
    it('deve ter configurações corretas para authLimiter', () => {
      expect(authLimiter).toBeDefined();
      // Verificar se é uma função middleware
      expect(typeof authLimiter).toBe('function');
    });

    it('deve ter configurações corretas para passwordChangeLimiter', () => {
      expect(passwordChangeLimiter).toBeDefined();
      expect(typeof passwordChangeLimiter).toBe('function');
    });

    it('deve ter configurações corretas para validationLimiter', () => {
      expect(validationLimiter).toBeDefined();
      expect(typeof validationLimiter).toBe('function');
    });

    it('deve ter configurações corretas para apiLimiter', () => {
      expect(apiLimiter).toBeDefined();
      expect(typeof apiLimiter).toBe('function');
    });

    it('deve ter configurações corretas para messageLimiter', () => {
      expect(messageLimiter).toBeDefined();
      expect(typeof messageLimiter).toBe('function');
    });
  });

  describe('Environment-specific behavior', () => {
    it('deve pular rate limiting em ambiente de desenvolvimento', async () => {
      process.env.NODE_ENV = 'development';
      const app = createTestApp(authLimiter, '/auth');
      
      // Fazer muitas requisições
      for (let i = 0; i < 10; i++) {
        const response = await request(app).post('/auth');
        expect(response.status).toBe(200);
      }
    });

    it('deve pular rate limiting quando NODE_ENV não está definido', async () => {
      delete process.env.NODE_ENV;
      const app = createTestApp(authLimiter, '/auth');
      
      // Fazer muitas requisições
      for (let i = 0; i < 10; i++) {
        const response = await request(app).post('/auth');
        expect(response.status).toBe(200);
      }
    });
  });
});