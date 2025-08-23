// tests/lib/validation.test.js
const InputValidator = require('../../lib/validation');

describe('InputValidator', () => {
  describe('sanitizeString', () => {
    it('deve sanitizar string removendo caracteres perigosos', () => {
      const input = '<script>alert("xss")</script>Hello World!';
      const result = InputValidator.sanitizeString(input);
      expect(result).not.toContain('<script>');
      expect(result).not.toContain('alert');
    });

    it('deve remover caracteres de controle', () => {
      const input = 'Hello\x00\x1F\x7FWorld';
      const result = InputValidator.sanitizeString(input);
      expect(result).toBe('HelloWorld');
    });

    it('deve escapar caracteres HTML', () => {
      const input = '<div>"test" & \'quote\'';
      const result = InputValidator.sanitizeString(input);
      expect(result).toContain('&lt;');
      expect(result).toContain('&gt;');
      expect(result).toContain('&quot;');
      expect(result).toContain('&amp;');
      expect(result).toContain('&#x27;');
    });

    it('deve retornar string vazia para input não-string', () => {
      expect(InputValidator.sanitizeString(null)).toBe('');
      expect(InputValidator.sanitizeString(undefined)).toBe('');
      expect(InputValidator.sanitizeString(123)).toBe('');
      expect(InputValidator.sanitizeString({})).toBe('');
    });

    it('deve fazer trim da string', () => {
      const input = '  Hello World  ';
      const result = InputValidator.sanitizeString(input);
      expect(result).toBe('Hello World');
    });
  });

  describe('validateEmail', () => {
    it('deve validar email válido', () => {
      const result = InputValidator.validateEmail('test@example.com');
      expect(result.isValid).toBe(true);
      expect(result.sanitized).toBe('test@example.com');
      expect(result.error).toBeUndefined();
    });

    it('deve normalizar email', () => {
      const result = InputValidator.validateEmail('  TEST@EXAMPLE.COM  ');
      expect(result.isValid).toBe(true);
      expect(result.sanitized).toBe('test@example.com');
    });

    it('deve rejeitar email inválido', () => {
      const result = InputValidator.validateEmail('invalid-email');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Formato de email inválido');
    });

    it('deve rejeitar email muito longo', () => {
      const longEmail = 'a'.repeat(250) + '@example.com';
      const result = InputValidator.validateEmail(longEmail);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Formato de email inválido');
    });

    it('deve rejeitar email vazio', () => {
      expect(InputValidator.validateEmail('').isValid).toBe(false);
      expect(InputValidator.validateEmail(null).isValid).toBe(false);
      expect(InputValidator.validateEmail(undefined).isValid).toBe(false);
    });
  });

  describe('validatePassword', () => {
    it('deve validar senha forte', () => {
      const result = InputValidator.validatePassword('StrongP@ss123');
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('deve rejeitar senha muito curta', () => {
      const result = InputValidator.validatePassword('Abc1!');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Senha deve ter pelo menos 8 caracteres');
    });

    it('deve rejeitar senha muito longa', () => {
      const longPassword = 'A'.repeat(130) + 'a1!';
      const result = InputValidator.validatePassword(longPassword);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Senha muito longa (máximo 128 caracteres)');
    });

    it('deve rejeitar senha sem letra minúscula', () => {
      const result = InputValidator.validatePassword('PASSWORD123!');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('1 letra minúscula');
    });

    it('deve rejeitar senha sem letra maiúscula', () => {
      const result = InputValidator.validatePassword('password123!');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('1 maiúscula');
    });

    it('deve rejeitar senha sem número', () => {
      const result = InputValidator.validatePassword('Password!');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('1 número');
    });

    it('deve rejeitar senha sem caractere especial', () => {
      const result = InputValidator.validatePassword('Password123');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('1 caractere especial');
    });

    it('deve rejeitar senha vazia ou nula', () => {
      expect(InputValidator.validatePassword('').isValid).toBe(false);
      expect(InputValidator.validatePassword(null).isValid).toBe(false);
      expect(InputValidator.validatePassword(undefined).isValid).toBe(false);
    });
  });

  describe('validateName', () => {
    it('deve validar nome válido', () => {
      const result = InputValidator.validateName('João Silva');
      expect(result.isValid).toBe(true);
      expect(result.sanitized).toBe('João Silva');
    });

    it('deve aceitar nomes com acentos e hífens', () => {
      const result = InputValidator.validateName('José-Maria da Conceição');
      expect(result.isValid).toBe(true);
    });

    it('deve rejeitar nomes com apostrofe após sanitização', () => {
      const result = InputValidator.validateName("O'Connor");
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Nome contém caracteres inválidos');
    });

    it('deve rejeitar nome muito curto', () => {
      const result = InputValidator.validateName('A');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Nome deve ter pelo menos 2 caracteres');
    });

    it('deve rejeitar nome muito longo', () => {
      const longName = 'A'.repeat(101);
      const result = InputValidator.validateName(longName);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Nome muito longo (máximo 100 caracteres)');
    });

    it('deve rejeitar nome com caracteres inválidos', () => {
      const result = InputValidator.validateName('João123');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Nome contém caracteres inválidos');
    });

    it('deve rejeitar nome vazio', () => {
      expect(InputValidator.validateName('').isValid).toBe(false);
      expect(InputValidator.validateName(null).isValid).toBe(false);
      expect(InputValidator.validateName(undefined).isValid).toBe(false);
    });
  });

  describe('validateCPF', () => {
    it('deve validar CPF válido', () => {
      const result = InputValidator.validateCPF('11144477735');
      expect(result.isValid).toBe(true);
      expect(result.sanitized).toBe('11144477735');
    });

    it('deve validar CPF com formatação', () => {
      const result = InputValidator.validateCPF('111.444.777-35');
      expect(result.isValid).toBe(true);
      expect(result.sanitized).toBe('11144477735');
    });

    it('deve rejeitar CPF com todos os dígitos iguais', () => {
      const result = InputValidator.validateCPF('11111111111');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('CPF inválido');
    });

    it('deve rejeitar CPF com número incorreto de dígitos', () => {
      const result = InputValidator.validateCPF('123456789');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('CPF deve ter 11 dígitos');
    });

    it('deve rejeitar CPF com dígitos verificadores inválidos', () => {
      const result = InputValidator.validateCPF('11144477736');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('CPF inválido');
    });

    it('deve rejeitar CPF vazio', () => {
      expect(InputValidator.validateCPF('').isValid).toBe(false);
      expect(InputValidator.validateCPF(null).isValid).toBe(false);
      expect(InputValidator.validateCPF(undefined).isValid).toBe(false);
    });
  });

  describe('validatePhone', () => {
    it('deve validar telefone válido', () => {
      const result = InputValidator.validatePhone('11987654321');
      expect(result.isValid).toBe(true);
      expect(result.sanitized).toBe('11987654321');
    });

    it('deve validar telefone com formatação', () => {
      const result = InputValidator.validatePhone('(11) 98765-4321');
      expect(result.isValid).toBe(true);
      expect(result.sanitized).toBe('11987654321');
    });

    it('deve validar telefone internacional', () => {
      const result = InputValidator.validatePhone('+5511987654321');
      expect(result.isValid).toBe(true);
      expect(result.sanitized).toBe('5511987654321');
    });

    it('deve rejeitar telefone muito curto', () => {
      const result = InputValidator.validatePhone('123456789');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Telefone deve ter entre 10 e 15 dígitos');
    });

    it('deve rejeitar telefone muito longo', () => {
      const result = InputValidator.validatePhone('1234567890123456');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Telefone deve ter entre 10 e 15 dígitos');
    });

    it('deve rejeitar telefone vazio', () => {
      expect(InputValidator.validatePhone('').isValid).toBe(false);
      expect(InputValidator.validatePhone(null).isValid).toBe(false);
      expect(InputValidator.validatePhone(undefined).isValid).toBe(false);
    });
  });

  describe('validateBirthdate', () => {
    it('deve validar data de nascimento válida', () => {
      const birthdate = '1990-05-15';
      const result = InputValidator.validateBirthdate(birthdate);
      expect(result.isValid).toBe(true);
      expect(result.sanitized).toBeInstanceOf(Date);
    });

    it('deve rejeitar menor de 18 anos', () => {
      const recentDate = new Date();
      recentDate.setFullYear(recentDate.getFullYear() - 17);
      const result = InputValidator.validateBirthdate(recentDate.toISOString());
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Usuário deve ser maior de 18 anos');
    });

    it('deve rejeitar data muito antiga', () => {
      const oldDate = new Date();
      oldDate.setFullYear(oldDate.getFullYear() - 121);
      const result = InputValidator.validateBirthdate(oldDate.toISOString());
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Data de nascimento inválida');
    });

    it('deve rejeitar data inválida', () => {
      const result = InputValidator.validateBirthdate('invalid-date');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Data de nascimento inválida');
    });

    it('deve rejeitar data vazia', () => {
      expect(InputValidator.validateBirthdate('').isValid).toBe(false);
      expect(InputValidator.validateBirthdate(null).isValid).toBe(false);
      expect(InputValidator.validateBirthdate(undefined).isValid).toBe(false);
    });
  });

  describe('validateMessageContent', () => {
    it('deve validar conteúdo de mensagem válido', () => {
      const result = InputValidator.validateMessageContent('Esta é uma mensagem válida.');
      expect(result.isValid).toBe(true);
      expect(result.sanitized).toBe('Esta é uma mensagem válida.');
    });

    it('deve sanitizar conteúdo perigoso', () => {
      const result = InputValidator.validateMessageContent('<script>alert("xss")</script>Mensagem');
      expect(result.isValid).toBe(true);
      expect(result.sanitized).not.toContain('<script>');
    });

    it('deve rejeitar conteúdo muito longo', () => {
      const longContent = 'A'.repeat(5001);
      const result = InputValidator.validateMessageContent(longContent);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Conteúdo muito longo (máximo 5000 caracteres)');
    });

    it('deve rejeitar conteúdo vazio', () => {
      expect(InputValidator.validateMessageContent('').isValid).toBe(false);
      expect(InputValidator.validateMessageContent('   ').isValid).toBe(false);
      expect(InputValidator.validateMessageContent(null).isValid).toBe(false);
      expect(InputValidator.validateMessageContent(undefined).isValid).toBe(false);
    });
  });

  describe('validateId', () => {
    it('deve validar UUID válido', () => {
      const uuid = '123e4567-e89b-12d3-a456-426614174000';
      const result = InputValidator.validateId(uuid);
      expect(result.isValid).toBe(true);
      expect(result.sanitized).toBe(uuid);
    });

    it('deve fazer trim do ID', () => {
      const uuid = '  123e4567-e89b-12d3-a456-426614174000  ';
      const result = InputValidator.validateId(uuid);
      expect(result.isValid).toBe(true);
      expect(result.sanitized).toBe('123e4567-e89b-12d3-a456-426614174000');
    });

    it('deve rejeitar ID inválido', () => {
      const result = InputValidator.validateId('invalid-id');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('ID inválido');
    });

    it('deve rejeitar ID vazio', () => {
      expect(InputValidator.validateId('').isValid).toBe(false);
      expect(InputValidator.validateId(null).isValid).toBe(false);
      expect(InputValidator.validateId(undefined).isValid).toBe(false);
    });
  });
});