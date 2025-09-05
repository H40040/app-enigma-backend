const request = require('supertest');
const app = require('../../index'); // Assuming your main app file is index.js

describe('Health Check Endpoints', () => {
  let prisma;

  beforeAll(() => {
    prisma = global.mockPrisma; // Use the global mockPrisma
  });

  afterEach(() => {
    // Clear all mocks after each test
    jest.clearAllMocks();
  });

  test('GET / should return 200 if database connection is successful', async () => {
    prisma.$queryRaw.mockResolvedValueOnce([1]);

    const res = await request(app).get('/api/health');

    expect(res.statusCode).toEqual(200);
    expect(res.body.status).toEqual('HEALTHY');
    expect(res.body.database).toEqual('connected');
    expect(res.body.environment).toHaveProperty('JWT_SECRET');
    expect(res.body.environment).toHaveProperty('REFRESH_TOKEN_SECRET');
    expect(res.body.environment).toHaveProperty('DATABASE_URL');
  });

  test('GET / should return 500 if database connection fails', async () => {
    prisma.$queryRaw.mockRejectedValueOnce(new Error('Database connection error'));

    const res = await request(app).get('/api/health');

    expect(res.statusCode).toEqual(500);
    expect(res.body.status).toEqual('UNHEALTHY');
    expect(res.body.error).toEqual('Database connection error');
    expect(res.body.database).toEqual('disconnected');
  });

  test('POST /test-post should return 200 if database connection is successful', async () => {
    prisma.user.count.mockResolvedValueOnce(10);

    const res = await request(app).post('/api/health/test-post').send({
      test: 'data'
    });

    expect(res.statusCode).toEqual(200);
    expect(res.body.message).toEqual('POST test successful');
    expect(res.body.userCount).toEqual(10);
    expect(res.body.database).toEqual('connected');
  });

  test('POST /test-post should return 500 if database connection fails', async () => {
    prisma.user.count.mockRejectedValueOnce(new Error('Database connection error for test-post'));

    const res = await request(app).post('/api/health/test-post').send({
      test: 'data'
    });

    expect(res.statusCode).toEqual(500);
    expect(res.body.error).toEqual('Test POST failed');
    expect(res.body.message).toEqual('Database connection error for test-post');
  });

  test('POST /test-auth should return 200 if database connection is successful', async () => {
    prisma.user.count.mockResolvedValueOnce(1);

    const res = await request(app).post('/api/health/test-auth').send({
      email: 'test@example.com',
      password: 'password123'
    });

    expect(res.statusCode).toEqual(200);
    expect(res.body.message).toEqual('Test auth successful');
    expect(res.body.userCount).toEqual(1);
  });

  test('POST /test-auth should return 500 if database connection fails', async () => {
    prisma.user.count.mockRejectedValueOnce(new Error('Database connection error for test-auth'));

    const res = await request(app).post('/api/health/test-auth').send({
      email: 'test@example.com',
      password: 'password123'
    });

    expect(res.statusCode).toEqual(500);
    expect(res.body.error).toEqual('Test auth failed');
    expect(res.body.details).toEqual('Database connection error for test-auth');
  });

  test('POST /test-auth should return 400 if email or password are missing', async () => {
    const res = await request(app).post('/api/health/test-auth').send({
      email: 'test@example.com'
    }); // Missing password

    expect(res.statusCode).toEqual(400);
    expect(res.body.error).toEqual('Email e senha são obrigatórios');

    const res2 = await request(app).post('/api/health/test-auth').send({
      password: 'password123'
    }); // Missing email

    expect(res2.statusCode).toEqual(400);
    expect(res2.body.error).toEqual('Email e senha são obrigatórios');
  });

  test('POST /simple-test should return 200 with correct body', async () => {
    const testBody = { key: 'value', number: 123 };
    const res = await request(app).post('/api/health/simple-test').send(testBody);

    expect(res.statusCode).toEqual(200);
    expect(res.body.message).toEqual('Simple POST test successful');
    expect(res.body.body).toEqual(testBody);
    expect(res.body).toHaveProperty('timestamp');
  });

  test('POST /simple-test should return 500 on error', async () => {
    const originalConsoleError = console.error;
    console.error = jest.fn();

    // Mock the route handler to throw an error
    const healthRoute = require('../routes/health');
    const originalSimpleTest = healthRoute.stack.find(s => s.route && s.route.path === '/simple-test' && s.route.methods.post).handle;
    healthRoute.stack.find(s => s.route && s.route.path === '/simple-test' && s.route.methods.post).handle = (req, res, next) => {
      next(new Error('Simulated simple-test error'));
    };

    const res = await request(app).post('/api/health/simple-test').send({});

    expect(res.statusCode).toEqual(500);
    expect(res.body.error).toEqual('Simple test failed');
    expect(res.body.details).toEqual('Simulated simple-test error');

    console.error = originalConsoleError; // Restore original console.error
    healthRoute.stack.find(s => s.route && s.route.path === '/simple-test' && s.route.methods.post).handle = originalSimpleTest; // Restore original handler
  });
});
