const express = require('express');
const isValidCPF = require('../lib/cpf');
const { validateCPF_ApiGratis } = require('../lib/apigratis-cpf');
const { validateWhatsapp_ApiGratis } = require('../lib/apigratis-whatsapp');

const router = express.Router();

// Validação de CPF (local + APIGratis)
router.post('/validate-cpf', async (req, res) => {
  const { cpf } = req.body;
  if (!cpf || typeof cpf !== 'string') {
    return res.status(400).json({ valid: false, error: 'CPF não informado' });
  }
  if (!isValidCPF(cpf)) {
    return res.status(200).json({ valid: false, error: 'CPF inválido (formato ou dígitos)' });
  }
  const apiResult = await validateCPF_ApiGratis(cpf);
  if (!apiResult.valid) {
    return res.status(200).json({ valid: false, error: 'CPF não encontrado na base nacional' });
  }
  res.json({ valid: true, nome: apiResult.nome, birthdate: apiResult.birthdate });
});

// Validação de WhatsApp (APIGratis)
router.post('/validate-whatsapp', async (req, res) => {
  const { numero } = req.body;
  if (!numero || typeof numero !== 'string') {
    return res.status(400).json({ valid: false, error: 'Número não informado' });
  }
  const apiResult = await validateWhatsapp_ApiGratis(numero);
  if (!apiResult.valid) {
    return res.status(200).json({ valid: false, error: 'Número não é WhatsApp válido' });
  }
  res.json({ valid: true });
});

module.exports = router;
