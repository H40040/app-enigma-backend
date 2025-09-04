// Mock do SDK da API Gratis ANTES de importar qualquer módulo
const mockRequest = jest.fn();
jest.mock('apigratis-sdk-nodejs', () => ({
  createCpfApi: jest.fn(() => ({
    request: mockRequest
  }))
}));

const { validateCPF_ApiGratis } = require('../../lib/apigratis-cpf');

describe('apigratis-cpf', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.SKIP_API_VALIDATION;
  });

  describe('validateCPF_ApiGratis', () => {

    it('deve validar CPF com sucesso quando API retorna dados válidos', async () => {
      const mockResponse = {
        status: true,
        resultado: {
          nome: 'João Silva',
          data_nascimento: '01/01/1990'
        }
      };
      mockRequest.mockResolvedValue(mockResponse);
      
      const result = await validateCPF_ApiGratis('12345678901');
      
      expect(result).toEqual({
        valid: true,
        nome: 'João Silva',
        birthdate: '1990-01-01'
      });
      expect(mockRequest).toHaveBeenCalledWith('/', { cpf: '12345678901' });
    });

    it('deve rejeitar CPF quando pessoa tem menos de 16 anos', async () => {
      const currentYear = new Date().getFullYear();
      const underageYear = currentYear - 15; // 15 anos
      
      const mockResponse = {
        status: true,
        resultado: {
          nome: 'João Menor',
          data_nascimento: `01/01/${underageYear}`
        }
      };
      mockRequest.mockResolvedValue(mockResponse);
      
      const result = await validateCPF_ApiGratis('12345678901');
      
      expect(result).toEqual({
        valid: false,
        error: 'É necessário ter pelo menos 16 anos para se cadastrar.'
      });
    });

    it('deve aceitar CPF quando pessoa tem exatamente 16 anos', async () => {
      const currentYear = new Date().getFullYear();
      const validYear = currentYear - 16; // 16 anos
      
      const mockResponse = {
        status: true,
        resultado: {
          nome: 'João Válido',
          data_nascimento: `01/01/${validYear}`
        }
      };
      mockRequest.mockResolvedValue(mockResponse);
      
      const result = await validateCPF_ApiGratis('12345678901');
      
      expect(result).toEqual({
        valid: true,
        nome: 'João Válido',
        birthdate: `${validYear}-01-01`
      });
    });

    it('deve retornar inválido quando API retorna status false', async () => {
      const mockResponse = {
        status: false
      };
      mockRequest.mockResolvedValue(mockResponse);
      
      const result = await validateCPF_ApiGratis('12345678901');
      
      expect(result).toEqual({ valid: false });
    });

    it('deve retornar inválido quando API não retorna resultado', async () => {
      const mockResponse = {
        status: true,
        resultado: null
      };
      mockRequest.mockResolvedValue(mockResponse);
      
      const result = await validateCPF_ApiGratis('12345678901');
      
      expect(result).toEqual({ valid: false });
    });

    it('deve tratar erro da API corretamente', async () => {
      const errorMessage = 'Erro na API';
      mockRequest.mockRejectedValue(new Error(errorMessage));
      
      const result = await validateCPF_ApiGratis('12345678901');
      
      expect(result).toEqual({
        valid: false,
        error: errorMessage
      });
    });

    it('deve tratar data de nascimento sem dados', async () => {
      const mockResponse = {
        status: true,
        resultado: {
          nome: 'João Sem Data'
          // data_nascimento não fornecida
        }
      };
      mockRequest.mockResolvedValue(mockResponse);
      
      const result = await validateCPF_ApiGratis('12345678901');
      
      expect(result).toEqual({
        valid: false,
        error: 'É necessário ter pelo menos 16 anos para se cadastrar.'
      });
    });

    it('deve formatar data corretamente com zeros à esquerda', async () => {
      const mockResponse = {
        status: true,
        resultado: {
          nome: 'João Data',
          data_nascimento: '5/3/1990' // Sem zeros à esquerda
        }
      };
      mockRequest.mockResolvedValue(mockResponse);
      
      const result = await validateCPF_ApiGratis('12345678901');
      
      expect(result).toEqual({
        valid: true,
        nome: 'João Data',
        birthdate: '1990-03-05'
      });
    });
  });
});