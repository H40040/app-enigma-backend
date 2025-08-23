// lib/validation.js
const validator = require('validator');
const DOMPurify = require('isomorphic-dompurify');

/**
 * Sanitiza e valida inputs de entrada
 */
class InputValidator {
  /**
   * Sanitiza string removendo caracteres perigosos
   * @param {string} input - String a ser sanitizada
   * @returns {string} String sanitizada
   */
  static sanitizeString(input) {
    if (typeof input !== 'string') {
      return '';
    }
    
    // Remove caracteres de controle e sanitiza HTML
    return DOMPurify.sanitize(input.trim())
      .replace(/[\x00-\x1F\x7F]/g, '') // Remove caracteres de controle
      .replace(/[<>"'&]/g, (char) => {
        const entities = {
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&#x27;',
          '&': '&amp;'
        };
        return entities[char];
      });
  }

  /**
   * Valida e sanitiza email
   * @param {string} email - Email a ser validado
   * @returns {object} {isValid: boolean, sanitized: string, error?: string}
   */
  static validateEmail(email) {
    if (!email || typeof email !== 'string') {
      return { isValid: false, sanitized: '', error: 'Email é obrigatório' };
    }

    const sanitized = validator.normalizeEmail(email.trim().toLowerCase());
    
    if (!validator.isEmail(sanitized)) {
      return { isValid: false, sanitized: '', error: 'Formato de email inválido' };
    }

    if (sanitized.length > 254) {
      return { isValid: false, sanitized: '', error: 'Email muito longo' };
    }

    return { isValid: true, sanitized };
  }

  /**
   * Valida senha com critérios de segurança
   * @param {string} password - Senha a ser validada
   * @returns {object} {isValid: boolean, error?: string}
   */
  static validatePassword(password) {
    if (!password || typeof password !== 'string') {
      return { isValid: false, error: 'Senha é obrigatória' };
    }

    if (password.length < 8) {
      return { isValid: false, error: 'Senha deve ter pelo menos 8 caracteres' };
    }

    if (password.length > 128) {
      return { isValid: false, error: 'Senha muito longa (máximo 128 caracteres)' };
    }

    // Verificar se contém pelo menos uma letra minúscula, maiúscula, número e caractere especial
    const hasLower = /[a-z]/.test(password);
    const hasUpper = /[A-Z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

    if (!hasLower || !hasUpper || !hasNumber || !hasSpecial) {
      return {
        isValid: false,
        error: 'Senha deve conter pelo menos: 1 letra minúscula, 1 maiúscula, 1 número e 1 caractere especial'
      };
    }

    return { isValid: true };
  }

  /**
   * Valida e sanitiza nome
   * @param {string} name - Nome a ser validado
   * @returns {object} {isValid: boolean, sanitized: string, error?: string}
   */
  static validateName(name) {
    if (!name || typeof name !== 'string') {
      return { isValid: false, sanitized: '', error: 'Nome é obrigatório' };
    }

    const sanitized = this.sanitizeString(name);
    
    if (sanitized.length < 2) {
      return { isValid: false, sanitized: '', error: 'Nome deve ter pelo menos 2 caracteres' };
    }

    if (sanitized.length > 100) {
      return { isValid: false, sanitized: '', error: 'Nome muito longo (máximo 100 caracteres)' };
    }

    // Verificar se contém apenas letras, espaços e alguns caracteres especiais permitidos
    if (!/^[a-zA-ZÀ-ÿ\s\-']+$/.test(sanitized)) {
      return { isValid: false, sanitized: '', error: 'Nome contém caracteres inválidos' };
    }

    return { isValid: true, sanitized };
  }

  /**
   * Valida CPF
   * @param {string} cpf - CPF a ser validado
   * @returns {object} {isValid: boolean, sanitized: string, error?: string}
   */
  static validateCPF(cpf) {
    if (!cpf || typeof cpf !== 'string') {
      return { isValid: false, sanitized: '', error: 'CPF é obrigatório' };
    }

    // Remove caracteres não numéricos
    const sanitized = cpf.replace(/\D/g, '');

    if (sanitized.length !== 11) {
      return { isValid: false, sanitized: '', error: 'CPF deve ter 11 dígitos' };
    }

    // Verificar se todos os dígitos são iguais
    if (/^(\d)\1{10}$/.test(sanitized)) {
      return { isValid: false, sanitized: '', error: 'CPF inválido' };
    }

    // Validação dos dígitos verificadores
    let sum = 0;
    for (let i = 0; i < 9; i++) {
      sum += parseInt(sanitized.charAt(i)) * (10 - i);
    }
    let remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(sanitized.charAt(9))) {
      return { isValid: false, sanitized: '', error: 'CPF inválido' };
    }

    sum = 0;
    for (let i = 0; i < 10; i++) {
      sum += parseInt(sanitized.charAt(i)) * (11 - i);
    }
    remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(sanitized.charAt(10))) {
      return { isValid: false, sanitized: '', error: 'CPF inválido' };
    }

    return { isValid: true, sanitized };
  }

  /**
   * Valida telefone/WhatsApp
   * @param {string} phone - Telefone a ser validado
   * @returns {object} {isValid: boolean, sanitized: string, error?: string}
   */
  static validatePhone(phone) {
    if (!phone || typeof phone !== 'string') {
      return { isValid: false, sanitized: '', error: 'Telefone é obrigatório' };
    }

    // Remove caracteres não numéricos
    const sanitized = phone.replace(/\D/g, '');

    // Verificar se tem entre 10 e 15 dígitos (padrão internacional)
    if (sanitized.length < 10 || sanitized.length > 15) {
      return { isValid: false, sanitized: '', error: 'Telefone deve ter entre 10 e 15 dígitos' };
    }

    return { isValid: true, sanitized };
  }

  /**
   * Valida data de nascimento
   * @param {string} birthdate - Data a ser validada
   * @returns {object} {isValid: boolean, sanitized: Date, error?: string}
   */
  static validateBirthdate(birthdate) {
    if (!birthdate) {
      return { isValid: false, sanitized: null, error: 'Data de nascimento é obrigatória' };
    }

    const date = new Date(birthdate);
    
    if (isNaN(date.getTime())) {
      return { isValid: false, sanitized: null, error: 'Data de nascimento inválida' };
    }

    const now = new Date();
    const age = now.getFullYear() - date.getFullYear();
    
    if (age < 18) {
      return { isValid: false, sanitized: null, error: 'Usuário deve ser maior de 18 anos' };
    }

    if (age > 120) {
      return { isValid: false, sanitized: null, error: 'Data de nascimento inválida' };
    }

    return { isValid: true, sanitized: date };
  }

  /**
   * Valida conteúdo de mensagem
   * @param {string} content - Conteúdo a ser validado
   * @returns {object} {isValid: boolean, sanitized: string, error?: string}
   */
  static validateMessageContent(content) {
    if (!content || typeof content !== 'string') {
      return { isValid: false, sanitized: '', error: 'Conteúdo é obrigatório' };
    }

    const sanitized = this.sanitizeString(content);
    
    if (sanitized.length < 5) {
      return { isValid: false, sanitized: '', error: 'Conteúdo muito curto (mínimo 5 caracteres)' };
    }

    if (sanitized.length > 5000) {
      return { isValid: false, sanitized: '', error: 'Conteúdo muito longo (máximo 5000 caracteres)' };
    }

    return { isValid: true, sanitized };
  }

  /**
   * Valida ID (UUID)
   * @param {string} id - ID a ser validado
   * @returns {object} {isValid: boolean, sanitized: string, error?: string}
   */
  static validateId(id) {
    if (!id || typeof id !== 'string') {
      return { isValid: false, sanitized: '', error: 'ID é obrigatório' };
    }

    const sanitized = id.trim();
    
    if (!validator.isUUID(sanitized)) {
      return { isValid: false, sanitized: '', error: 'ID inválido' };
    }

    return { isValid: true, sanitized };
  }
}

module.exports = InputValidator;