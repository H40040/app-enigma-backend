const errorHandler = require('../../middleware/errorHandler');

describe('Error Handler Middleware', () => {
  let mockReq, mockRes, mockNext;

  beforeEach(() => {
    mockReq = {};
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    mockNext = jest.fn();
    
    // Mock console.error to avoid cluttering test output
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Error handling', () => {
    it('deve tratar erro com statusCode e message customizados', () => {
      const error = {
        statusCode: 400,
        message: 'Erro de validação',
        stack: 'Error stack trace'
      };

      errorHandler(error, mockReq, mockRes, mockNext);

      expect(console.error).toHaveBeenCalledWith(error.stack);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Erro de validação',
        details: undefined
      });
    });

    it('deve usar status 500 e mensagem padrão quando não fornecidos', () => {
      const error = {
        stack: 'Error stack trace'
      };

      errorHandler(error, mockReq, mockRes, mockNext);

      expect(console.error).toHaveBeenCalledWith(error.stack);
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Erro interno do servidor',
        details: undefined
      });
    });

    it('deve incluir stack trace em ambiente de desenvolvimento', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const error = {
        statusCode: 404,
        message: 'Não encontrado',
        stack: 'Error stack trace'
      };

      errorHandler(error, mockReq, mockRes, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Não encontrado',
        details: 'Error stack trace'
      });

      process.env.NODE_ENV = originalEnv;
    });

    it('deve ocultar stack trace em ambiente de produção', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const error = {
        statusCode: 500,
        message: 'Erro interno',
        stack: 'Error stack trace'
      };

      errorHandler(error, mockReq, mockRes, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Erro interno',
        details: undefined
      });

      process.env.NODE_ENV = originalEnv;
    });

    it('deve tratar erro sem stack trace', () => {
      const error = {
        statusCode: 401,
        message: 'Não autorizado'
      };

      errorHandler(error, mockReq, mockRes, mockNext);

      expect(console.error).toHaveBeenCalledWith(undefined);
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Não autorizado',
        details: undefined
      });
    });

    it('deve tratar objeto Error nativo do JavaScript', () => {
      const error = new Error('Erro nativo');
      error.statusCode = 422;

      errorHandler(error, mockReq, mockRes, mockNext);

      expect(console.error).toHaveBeenCalledWith(error.stack);
      expect(mockRes.status).toHaveBeenCalledWith(422);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Erro nativo',
        details: undefined
      });
    });
  });

  describe('Environment handling', () => {
    it('deve funcionar quando NODE_ENV não está definido', () => {
      const originalEnv = process.env.NODE_ENV;
      delete process.env.NODE_ENV;

      const error = {
        statusCode: 400,
        message: 'Erro de teste',
        stack: 'Stack trace'
      };

      errorHandler(error, mockReq, mockRes, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Erro de teste',
        details: undefined
      });

      process.env.NODE_ENV = originalEnv;
    });
  });
});