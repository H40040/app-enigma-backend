// backend/routes/register.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const prisma = require('../lib/prisma');
const jwt = require('jsonwebtoken');
const { authLimiter } = require('../middleware/rateLimit');
const InputValidator = require('../lib/validation');
const JWT_SECRET = process.env.JWT_SECRET;
const TOKEN_EXPIRATION = process.env.TOKEN_EXPIRATION || '1h';

if (!JWT_SECRET) {
  console.error('ERRO CRÍTICO: JWT_SECRET não configurado');
  process.exit(1);
}

router.post('/register', authLimiter, async (req, res) => {
  const { email, password, name, birthdate, cpf, whatsapp } = req.body;

  // Validação e sanitização de inputs
  const emailValidation = InputValidator.validateEmail(email);
  if (!emailValidation.isValid) {
    return res.status(400).json({ error: emailValidation.error });
  }

  const passwordValidation = InputValidator.validatePassword(password);
  if (!passwordValidation.isValid) {
    return res.status(400).json({ error: passwordValidation.error });
  }

  const nameValidation = InputValidator.validateName(name);
  if (!nameValidation.isValid) {
    return res.status(400).json({ error: nameValidation.error });
  }

  const birthdateValidation = InputValidator.validateBirthdate(birthdate);
  if (!birthdateValidation.isValid) {
    return res.status(400).json({ error: birthdateValidation.error });
  }

  const cpfValidation = InputValidator.validateCPF(cpf);
  if (!cpfValidation.isValid) {
    return res.status(400).json({ error: cpfValidation.error });
  }

  let phoneValidation = { isValid: true, sanitized: null };
  if (whatsapp) {
    phoneValidation = InputValidator.validatePhone(whatsapp);
    if (!phoneValidation.isValid) {
      return res.status(400).json({ error: phoneValidation.error });
    }
  }

  try {
    // Usar valores sanitizados
    const sanitizedEmail = emailValidation.sanitized;
    const sanitizedName = nameValidation.sanitized;
    const sanitizedCpf = cpfValidation.sanitized;
    const sanitizedBirthdate = birthdateValidation.sanitized;
    const sanitizedWhatsapp = phoneValidation.sanitized;

    const existingUser = await prisma.user.findUnique({ where: { email: sanitizedEmail } });
    if (existingUser) {
      return res.status(409).json({ error: 'Usuário já existe' });
    }

    // Verificar se já existe um usuário com este CPF
    const existingCpf = await prisma.user.findFirst({ where: { cpf: sanitizedCpf } });
    if (existingCpf) {
      return res.status(409).json({ error: 'CPF já cadastrado' });
    }

    // Hash da senha com salt mais alto para segurança
    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        email: sanitizedEmail,
        password: hashedPassword,
        name: sanitizedName,
        birthdate: sanitizedBirthdate,
        cpf: sanitizedCpf,
        whatsapp: sanitizedWhatsapp,
      },
    });

    // Gera o token JWT após o cadastro
    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email },
      JWT_SECRET,
      { expiresIn: TOKEN_EXPIRATION }
    );

    // TODO: Implementar sistema de mensagens pendentes quando necessário
    // (Removido código incompatível com schema atual do Prisma)

    // Log de auditoria (sem dados sensíveis)
    console.log(`[AUDIT] Novo usuário registrado: ID=${user.id}, Email=${sanitizedEmail}`);

    // Nunca retorne a senha do usuário
    res.status(201).json({ 
      success: true,
      user: {
        id: user.id, 
        name: user.name, 
        email: user.email, 
        isAdmin: user.isAdmin, 
        createdAt: user.createdAt
      },
      token 
    });
  } catch (error) {
    console.error('Erro no registro:', error);
    res.status(500).json({ error: 'Erro ao registrar usuário' });
  }
});

module.exports = router;
