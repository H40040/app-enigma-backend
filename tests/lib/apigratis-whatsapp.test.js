// Mock do apigratis-sdk-nodejs antes de importar o módulo
const mockRequest = jest.fn();
jest.mock('apigratis-sdk-nodejs', () => ({
  createWhatsAppApi: jest.fn(() => ({
    request: mockRequest
  }))
}));

const { validateWhatsapp_ApiGratis } = require('../../lib/apigratis-whatsapp');

describe('validateWhatsapp_ApiGratis', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.SKIP_API_VALIDATION;
  });

  afterEach(() => {
    delete process.env.SKIP_API_VALIDATION;
  });


  describe('validação com API', () => {
    it('deve retornar válido para WhatsApp válido', async () => {
      mockRequest.mockResolvedValue({
        status: true,
        resultado: {
          is_whatsapp: true
        }
      });

      const result = await validateWhatsapp_ApiGratis('5511999999999');

      expect(result).toEqual({ valid: true });
      expect(mockRequest).toHaveBeenCalledWith('/', { numero: '5511999999999' });
    });

    it('deve retornar inválido quando is_whatsapp é false', async () => {
      mockRequest.mockResolvedValue({
        status: true,
        resultado: {
          is_whatsapp: false
        }
      });

      const result = await validateWhatsapp_ApiGratis('5511888888888');

      expect(result).toEqual({ valid: false });
      expect(mockRequest).toHaveBeenCalledWith('/', { numero: '5511888888888' });
    });

    it('deve retornar inválido quando status é false', async () => {
      mockRequest.mockResolvedValue({
        status: false,
        resultado: {
          is_whatsapp: true
        }
      });

      const result = await validateWhatsapp_ApiGratis('5511777777777');

      expect(result).toEqual({ valid: false });
      expect(mockRequest).toHaveBeenCalledWith('/', { numero: '5511777777777' });
    });

    it('deve retornar inválido quando resultado está ausente', async () => {
      mockRequest.mockResolvedValue({
        status: true
      });

      const result = await validateWhatsapp_ApiGratis('5511666666666');

      expect(result).toEqual({ valid: false });
      expect(mockRequest).toHaveBeenCalledWith('/', { numero: '5511666666666' });
    });

    it('deve retornar inválido quando resposta é null', async () => {
      mockRequest.mockResolvedValue(null);

      const result = await validateWhatsapp_ApiGratis('5511555555555');

      expect(result).toEqual({ valid: false });
      expect(mockRequest).toHaveBeenCalledWith('/', { numero: '5511555555555' });
    });

    it('deve retornar inválido quando resposta é undefined', async () => {
      mockRequest.mockResolvedValue(undefined);

      const result = await validateWhatsapp_ApiGratis('5511444444444');

      expect(result).toEqual({ valid: false });
      expect(mockRequest).toHaveBeenCalledWith('/', { numero: '5511444444444' });
    });
  });

  describe('tratamento de erros', () => {
    it('deve tratar erro da API corretamente', async () => {
      const errorMessage = 'API Error: Network timeout';
      mockRequest.mockRejectedValue(new Error(errorMessage));

      const result = await validateWhatsapp_ApiGratis('5511333333333');

      expect(result).toEqual({ valid: false, error: errorMessage });
      expect(mockRequest).toHaveBeenCalledWith('/', { numero: '5511333333333' });
    });

    it('deve tratar erro sem mensagem', async () => {
      mockRequest.mockRejectedValue(new Error());

      const result = await validateWhatsapp_ApiGratis('5511222222222');

      expect(result).toEqual({ valid: false, error: '' });
      expect(mockRequest).toHaveBeenCalledWith('/', { numero: '5511222222222' });
    });

    it('deve tratar rejeição com string', async () => {
      const errorMessage = 'String error';
      mockRequest.mockRejectedValue(errorMessage);

      const result = await validateWhatsapp_ApiGratis('5511111111111');

      expect(result).toEqual({ valid: false, error: undefined });
      expect(mockRequest).toHaveBeenCalledWith('/', { numero: '5511111111111' });
    });
  });

  describe('diferentes formatos de número', () => {
    it('deve validar número com formatação', async () => {
      mockRequest.mockResolvedValue({
        status: true,
        resultado: {
          is_whatsapp: true
        }
      });

      const result = await validateWhatsapp_ApiGratis('+55 (11) 99999-9999');

      expect(result).toEqual({ valid: true });
      expect(mockRequest).toHaveBeenCalledWith('/', { numero: '+55 (11) 99999-9999' });
    });

    it('deve validar número sem código do país', async () => {
      mockRequest.mockResolvedValue({
        status: true,
        resultado: {
          is_whatsapp: true
        }
      });

      const result = await validateWhatsapp_ApiGratis('11999999999');

      expect(result).toEqual({ valid: true });
      expect(mockRequest).toHaveBeenCalledWith('/', { numero: '11999999999' });
    });
  });
});