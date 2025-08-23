const express = require('express');
const isValidCPF = require('../lib/cpf');
const { validateCPF_ApiGratis } = require('../lib/apigratis-cpf');
const { validateWhatsapp_ApiGratis } = require('../lib/apigratis-whatsapp');
const InputValidator = require('../lib/validation');

const router = express.Router();

// Validação de CPF (local + APIGratis)
router.post('/validate-cpf', async (req, res) => {
  const { cpf } = req.body;

  // Validação e sanitização do CPF
  const cpfValidation = InputValidator.validateCPF(cpf);
  if (!cpfValidation.isValid) {
    return res.status(400).json({ 
      valid: false, 
      error: cpfValidation.error 
    });
  }

  try {
    // Log de validação para auditoria
    console.log(`[AUDIT] Validação CPF: IP=${req.ip}`);
    
    if (!isValidCPF(cpfValidation.sanitized)) {
      return res.status(200).json({ valid: false, error: 'CPF inválido (formato ou dígitos)' });
    }
  const apiResult = await validateCPF_ApiGratis(cpfValidation.sanitized);
    if (!apiResult.valid) {
      return res.status(200).json({ valid: false, error: 'CPF não encontrado na base nacional' });
    }
    res.json({ valid: true, nome: apiResult.nome, birthdate: apiResult.birthdate });
  } catch (error) {
    console.error('Erro na validação de CPF:', error);
    res.status(500).json({ valid: false, error: 'Erro interno do servidor' });
  }
});

// Validação de WhatsApp (APIGratis)
router.post('/validate-whatsapp', async (req, res) => {
  const { numero } = req.body;

  // Validação e sanitização do número de WhatsApp
  const phoneValidation = InputValidator.validatePhone(numero);
  if (!phoneValidation.isValid) {
    return res.status(400).json({ 
      valid: false, 
      error: phoneValidation.error 
    });
  }

  try {
    // Log de validação para auditoria
    console.log(`[AUDIT] Validação WhatsApp: IP=${req.ip}`);
    
    const apiResult = await validateWhatsapp_ApiGratis(phoneValidation.sanitized);
    if (!apiResult.valid) {
      return res.status(200).json({ valid: false, error: 'Número não é WhatsApp válido' });
    }
    res.json({ valid: true });
  } catch (error) {
    console.error('Erro na validação de WhatsApp:', error);
    res.status(500).json({ valid: false, error: 'Erro interno do servidor' });
  }
});

module.exports = router;
