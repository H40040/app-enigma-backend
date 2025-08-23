// tests/routes/validate.test.js
const request = require('supertest');
const app = require('../../index');
const isValidCPF = require('../../lib/cpf');
const { validateCPF_ApiGratis } = require('../../lib/apigratis-cpf');
const { validateWhatsapp_ApiGratis } = require('../../lib/apigratis-whatsapp');

// Mock das dependências
jest.mock('../../lib/cpf');
jest.mock('../../lib/apigratis-cpf');
jest.mock('../../lib/apigratis-whatsapp');

// Mock do rate limiting para testes
jest.mock('express-rate-limit', () => {
  return jest.fn(() => (req, res, next) => next());
});

describe('Validate Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /validate-cpf', () => {
    it('deve validar CPF com sucesso', async () => {
      isValidCPF.mockReturnValue(true);
      validateCPF_ApiGratis.mockResolvedValue({
        valid: true,
        nome: 'João Silva',
        birthdate: '1990-01-01'
      });

      const response = await request(app)
        .post('/api/validate-cpf')
        .send({
          cpf: '123.456.789-09'
        });

      expect(response.status).toBe(200);
      expect(response.body.valid).toBe(true);
      expect(response.body.nome).toBe('João Silva');
      expect(response.body.birthdate).toBe('1990-01-01');
      expect(isValidCPF).toHaveBeenCalledWith('12345678909');
      expect(validateCPF_ApiGratis).toHaveBeenCalledWith('12345678909');
    });

    it('deve sanitizar CPF removendo pontos e traços', async () => {
      isValidCPF.mockReturnValue(true);
      validateCPF_ApiGratis.mockResolvedValue({
        valid: true,
        nome: 'Maria Santos',
        birthdate: '1985-05-15'
      });

      const response = await request(app)
        .post('/api/validate-cpf')
        .send({
          cpf: '987.654.321-00'
        });

      expect(response.status).toBe(200);
      expect(isValidCPF).toHaveBeenCalledWith('98765432100');
      expect(validateCPF_ApiGratis).toHaveBeenCalledWith('98765432100');
    });

    it('deve aceitar CPF sem formatação', async () => {
      isValidCPF.mockReturnValue(true);
      validateCPF_ApiGratis.mockResolvedValue({
        valid: true,
        nome: 'Pedro Costa',
        birthdate: '1992-12-25'
      });

      const response = await request(app)
        .post('/api/validate-cpf')
        .send({
          cpf: '11144477735'
        });

      expect(response.status).toBe(200);
      expect(response.body.valid).toBe(true);
      expect(isValidCPF).toHaveBeenCalledWith('11144477735');
    });

    it('deve retornar 400 para CPF vazio', async () => {
      const response = await request(app)
        .post('/api/validate-cpf')
        .send({
          cpf: ''
        });

      expect(response.status).toBe(400);
      expect(response.body.valid).toBe(false);
      expect(response.body.error).toBe('CPF é obrigatório');
    });

    it('deve retornar 400 para CPF ausente', async () => {
      const response = await request(app)
        .post('/api/validate-cpf')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.valid).toBe(false);
      expect(response.body.error).toBe('CPF é obrigatório');
    });

    it('deve retornar 400 para CPF com formato inválido', async () => {
      const response = await request(app)
        .post('/api/validate-cpf')
        .send({
          cpf: '123.456.789'
        });

      expect(response.status).toBe(400);
      expect(response.body.valid).toBe(false);
      expect(response.body.error).toBe('CPF deve ter 11 dígitos');
    });

    it('deve retornar 400 para CPF muito curto', async () => {
      const response = await request(app)
        .post('/api/validate-cpf')
        .send({
          cpf: '123456789'
        });

      expect(response.status).toBe(400);
      expect(response.body.valid).toBe(false);
      expect(response.body.error).toBe('CPF deve ter 11 dígitos');
    });

    it('deve retornar 400 para CPF muito longo', async () => {
      const response = await request(app)
        .post('/api/validate-cpf')
        .send({
          cpf: '12345678901234567890'
        });

      expect(response.status).toBe(400);
      expect(response.body.valid).toBe(false);
      expect(response.body.error).toBe('CPF deve ter 11 dígitos');
    });

    it('deve retornar 400 para CPF com caracteres inválidos', async () => {
      const response = await request(app)
        .post('/api/validate-cpf')
        .send({
          cpf: 'abc.def.ghi-jk'
        });

      expect(response.status).toBe(400);
      expect(response.body.valid).toBe(false);
      expect(response.body.error).toBe('CPF deve ter 11 dígitos');
    });

    it('deve retornar 400 para CPF não string', async () => {
      const response = await request(app)
        .post('/api/validate-cpf')
        .send({
          cpf: 12345678909
        });

      expect(response.status).toBe(400);
      expect(response.body.valid).toBe(false);
      expect(response.body.error).toBe('CPF é obrigatório');
    });

    it('deve retornar false para CPF com formato inválido (dígitos verificadores)', async () => {
      isValidCPF.mockReturnValue(false);

      const response = await request(app)
        .post('/api/validate-cpf')
        .send({
          cpf: '123.456.789-09'
        });

      expect(response.status).toBe(200);
      expect(response.body.valid).toBe(false);
      expect(response.body.error).toBe('CPF inválido (formato ou dígitos)');
      expect(validateCPF_ApiGratis).not.toHaveBeenCalled();
    });

    it('deve retornar false para CPF não encontrado na base nacional', async () => {
      isValidCPF.mockReturnValue(true);
      validateCPF_ApiGratis.mockResolvedValue({
        valid: false
      });

      const response = await request(app)
        .post('/api/validate-cpf')
        .send({
          cpf: '   123.456.789-09   '
        });

      expect(response.status).toBe(200);
      expect(response.body.valid).toBe(false);
      expect(response.body.error).toBe('CPF não encontrado na base nacional');
    });

    it('deve lidar com erro interno do servidor', async () => {
      isValidCPF.mockImplementation(() => {
        throw new Error('Erro interno');
      });

      const response = await request(app)
        .post('/api/validate-cpf')
        .send({
          cpf: '123.456.789-09'
        });

      expect(response.status).toBe(500);
      expect(response.body.valid).toBe(false);
      expect(response.body.error).toBe('Erro interno do servidor');
    });

    it('deve lidar com erro da API externa', async () => {
      isValidCPF.mockReturnValue(true);
      validateCPF_ApiGratis.mockRejectedValue(new Error('API Error'));

      const response = await request(app)
        .post('/api/validate-cpf')
        .send({
          cpf: '12345678909'
        });

      expect(response.status).toBe(500);
      expect(response.body.valid).toBe(false);
      expect(response.body.error).toBe('Erro interno do servidor');
    });

    it('deve fazer log de auditoria', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      isValidCPF.mockReturnValue(true);
      validateCPF_ApiGratis.mockResolvedValue({
        valid: true,
        nome: 'Teste',
        birthdate: '1990-01-01'
      });

      await request(app)
        .post('/api/validate-cpf')
        .send({
          cpf: '123.456.789-09'
        });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[AUDIT] Validação CPF: IP=')
      );

      consoleSpy.mockRestore();
    });

    it('deve fazer log de erro em caso de falha', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const error = new Error('Test error');
      
      isValidCPF.mockImplementation(() => {
        throw error;
      });

      await request(app)
        .post('/api/validate-cpf')
        .send({
          cpf: '123.456.789-09'
        });

      expect(consoleSpy).toHaveBeenCalledWith('Erro na validação de CPF:', error);
      
      consoleSpy.mockRestore();
    });
  });

  describe('POST /validate-whatsapp', () => {
    it('deve validar WhatsApp com sucesso', async () => {
      validateWhatsapp_ApiGratis.mockResolvedValue({
        valid: true
      });

      const response = await request(app)
        .post('/api/validate-whatsapp')
        .send({
          numero: '5511999887766'
        });

      expect(response.status).toBe(200);
      expect(response.body.valid).toBe(true);
      expect(validateWhatsapp_ApiGratis).toHaveBeenCalledWith('5511999887766');
    });

    it('deve sanitizar número de WhatsApp', async () => {
      validateWhatsapp_ApiGratis.mockResolvedValue({
        valid: true
      });

      const response = await request(app)
        .post('/api/validate-whatsapp')
        .send({
          numero: '  +55 11 99988-7766  '
        });

      expect(response.status).toBe(200);
      expect(validateWhatsapp_ApiGratis).toHaveBeenCalledWith('5511999887766');
    });

    it('deve aceitar número sem formatação', async () => {
      validateWhatsapp_ApiGratis.mockResolvedValue({
        valid: true
      });

      const response = await request(app)
        .post('/api/validate-whatsapp')
        .send({
          numero: '11999887766'
        });

      expect(response.status).toBe(200);
      expect(response.body.valid).toBe(true);
      expect(validateWhatsapp_ApiGratis).toHaveBeenCalledWith('11999887766');
    });

    it('deve retornar 400 para número vazio', async () => {
      const response = await request(app)
        .post('/api/validate-whatsapp')
        .send({
          numero: ''
        });

      expect(response.status).toBe(400);
      expect(response.body.valid).toBe(false);
      expect(response.body.error).toBe('Telefone é obrigatório');
    });

    it('deve retornar 400 para número ausente', async () => {
      const response = await request(app)
        .post('/api/validate-whatsapp')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.valid).toBe(false);
      expect(response.body.error).toBe('Telefone é obrigatório');
    });

    it('deve retornar 400 para número muito curto', async () => {
      const response = await request(app)
        .post('/api/validate-whatsapp')
        .send({
          numero: '123'
        });

      expect(response.status).toBe(400);
      expect(response.body.valid).toBe(false);
      expect(response.body.error).toBe('Telefone deve ter entre 10 e 15 dígitos');
    });

    it('deve retornar 400 para número muito longo', async () => {
      const response = await request(app)
        .post('/api/validate-whatsapp')
        .send({
          numero: '12345678901234567890'
        });

      expect(response.status).toBe(400);
      expect(response.body.valid).toBe(false);
      expect(response.body.error).toBe('Telefone deve ter entre 10 e 15 dígitos');
    });

    it('deve retornar 400 para número com poucos dígitos', async () => {
      const response = await request(app)
        .post('/api/validate-whatsapp')
        .send({
          numero: '123456789'
        });

      expect(response.status).toBe(400);
      expect(response.body.valid).toBe(false);
      expect(response.body.error).toBe('Telefone deve ter entre 10 e 15 dígitos');
    });

    it('deve retornar 400 para número não string', async () => {
      const response = await request(app)
        .post('/api/validate-whatsapp')
        .send({
          numero: 5511999887766
        });

      expect(response.status).toBe(400);
      expect(response.body.valid).toBe(false);
      expect(response.body.error).toBe('Telefone é obrigatório');
    });

    it('deve retornar false para número não WhatsApp válido', async () => {
      validateWhatsapp_ApiGratis.mockResolvedValue({
        valid: false
      });

      const response = await request(app)
        .post('/api/validate-whatsapp')
        .send({
          numero: '   +5511999887766   '
        });

      expect(response.status).toBe(200);
      expect(response.body.valid).toBe(false);
      expect(response.body.error).toBe('Número não é WhatsApp válido');
    });

    it('deve lidar com erro interno do servidor', async () => {
      validateWhatsapp_ApiGratis.mockRejectedValue(new Error('API Error'));

      const response = await request(app)
        .post('/api/validate-whatsapp')
        .send({
          numero: '+5511999887766'
        });

      expect(response.status).toBe(500);
      expect(response.body.valid).toBe(false);
      expect(response.body.error).toBe('Erro interno do servidor');
    });

    it('deve fazer log de auditoria', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      validateWhatsapp_ApiGratis.mockResolvedValue({
        valid: true
      });

      await request(app)
        .post('/api/validate-whatsapp')
        .send({
          numero: '+5511999887766'
        });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[AUDIT] Validação WhatsApp: IP=')
      );

      consoleSpy.mockRestore();
    });

    it('deve fazer log de erro em caso de falha', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const error = new Error('Test error');
      
      validateWhatsapp_ApiGratis.mockRejectedValue(error);

      await request(app)
        .post('/api/validate-whatsapp')
        .send({
          numero: '+5511999887766'
        });

      expect(consoleSpy).toHaveBeenCalledWith('Erro na validação de WhatsApp:', error);
      
      consoleSpy.mockRestore();
    });

    it('deve aceitar números com diferentes formatos válidos', async () => {
      validateWhatsapp_ApiGratis.mockResolvedValue({ valid: true });

      const validFormats = [
        '+55 11 99988-7766',
        '+55 (11) 99988-7766',
        '55 11 999887766',
        '(11) 99988-7766',
        '11 99988-7766',
        '11999887766'
      ];

      for (const format of validFormats) {
        const response = await request(app)
          .post('/api/validate-whatsapp')
          .send({ numero: format });

        expect(response.status).toBe(200);
        expect(response.body.valid).toBe(true);
      }
    });

    it('deve rejeitar números com formatos inválidos', async () => {
      const invalidFormats = [
        '123',
        '12345678901234567',
        'abc123',
        '123456789',
        '1234567890123456789'
      ];

      for (const format of invalidFormats) {
        const response = await request(app)
          .post('/api/validate-whatsapp')
          .send({ numero: format });

        expect(response.status).toBe(400);
        expect(response.body.valid).toBe(false);
      }
    });
  });
});