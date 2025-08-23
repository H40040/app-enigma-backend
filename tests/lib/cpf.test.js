const isValidCPF = require('../../lib/cpf');

describe('cpf', () => {
  describe('isValidCPF', () => {
    it('deve validar CPF válido sem formatação', () => {
      expect(isValidCPF('11144477735')).toBe(true);
      expect(isValidCPF('12345678909')).toBe(true);
      expect(isValidCPF('98765432100')).toBe(true);
    });

    it('deve validar CPF válido com formatação', () => {
      expect(isValidCPF('111.444.777-35')).toBe(true);
      expect(isValidCPF('123.456.789-09')).toBe(true);
      expect(isValidCPF('987.654.321-00')).toBe(true);
    });

    it('deve rejeitar CPF com menos de 11 dígitos', () => {
      expect(isValidCPF('1234567890')).toBe(false);
      expect(isValidCPF('123456789')).toBe(false);
      expect(isValidCPF('12345')).toBe(false);
      expect(isValidCPF('')).toBe(false);
    });

    it('deve rejeitar CPF com mais de 11 dígitos', () => {
      expect(isValidCPF('123456789012')).toBe(false);
      expect(isValidCPF('1234567890123')).toBe(false);
    });

    it('deve rejeitar CPF com todos os dígitos iguais', () => {
      expect(isValidCPF('00000000000')).toBe(false);
      expect(isValidCPF('11111111111')).toBe(false);
      expect(isValidCPF('22222222222')).toBe(false);
      expect(isValidCPF('33333333333')).toBe(false);
      expect(isValidCPF('44444444444')).toBe(false);
      expect(isValidCPF('55555555555')).toBe(false);
      expect(isValidCPF('66666666666')).toBe(false);
      expect(isValidCPF('77777777777')).toBe(false);
      expect(isValidCPF('88888888888')).toBe(false);
      expect(isValidCPF('99999999999')).toBe(false);
    });

    it('deve rejeitar CPF com dígitos verificadores incorretos', () => {
      expect(isValidCPF('11144477734')).toBe(false); // último dígito errado
      expect(isValidCPF('11144477725')).toBe(false); // penúltimo dígito errado
      expect(isValidCPF('11144477700')).toBe(false); // ambos dígitos errados
    });

    it('deve lidar com CPF contendo caracteres não numéricos', () => {
      expect(isValidCPF('111.444.777-35')).toBe(true);
      expect(isValidCPF('111 444 777 35')).toBe(true);
      expect(isValidCPF('111/444/777-35')).toBe(true);
      expect(isValidCPF('111abc444def777ghi35')).toBe(true);
    });

    it('deve rejeitar entrada null ou undefined', () => {
      expect(() => isValidCPF(null)).toThrow();
      expect(() => isValidCPF(undefined)).toThrow();
    });

    it('deve validar CPFs conhecidos válidos', () => {
      // CPFs gerados por algoritmo válido
      expect(isValidCPF('52998224725')).toBe(true);
      expect(isValidCPF('11144477735')).toBe(true);
      expect(isValidCPF('12345678909')).toBe(true);
    });

    it('deve rejeitar CPFs conhecidos inválidos', () => {
      expect(isValidCPF('12345678901')).toBe(false);
      expect(isValidCPF('98765432101')).toBe(false);
      expect(isValidCPF('11111111112')).toBe(false);
    });

    it('deve lidar com strings vazias e espaços', () => {
      expect(isValidCPF('')).toBe(false);
      expect(isValidCPF('   ')).toBe(false);
      expect(isValidCPF('\t\n')).toBe(false);
    });

    it('deve validar CPF com zeros à esquerda', () => {
      expect(isValidCPF('01234567890')).toBe(true);  // válido
      expect(isValidCPF('00000000191')).toBe(true);  // válido com zeros
    });
  });
});