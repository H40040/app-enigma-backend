require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { PrismaClient } = require('@prisma/client');
const compression = require('compression');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
// Middleware para proteção contra XSS e sanitização básica
const xss = require('xss-clean');
const mongoSanitize = require('express-mongo-sanitize');
const cookieParser = require('cookie-parser');
const hpp = require('hpp'); // Add hpp to prevent HTTP Parameter Pollution
const csurf = require('csurf'); // CSRF protection

// Importação de rotas
const register = require('./routes/register');
const auth = require('./routes/auth');
const dashboard = require('./routes/dashboard');
const interaction = require('./routes/interaction');
const hintRoutes = require('./routes/hint');
const userRoutes = require('./routes/user');
const messageRoutes = require('./routes/message'); // Add this line
const validateRoutes = require('./routes/validate');
const { authenticateToken, trackUserActivity, checkSessionActivity } = require('./middleware/authMiddleware');
const { authLimiter, passwordChangeLimiter, validationLimiter, apiLimiter: customApiLimiter, messageLimiter } = require('./middleware/rateLimit');

// Inicialização segura do Prisma
let prisma;
try {
  prisma = new PrismaClient();
} catch (error) {
  console.error('Erro ao inicializar o Prisma Client:', error);
  process.exit(1);
}

const app = express();

// Middlewares de segurança e performance
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:', 'blob:'],
      connectSrc: ["'self'", process.env.FRONTEND_URL || 'https://app-enigma-frontend-git-develop-h40040s-projects.vercel.app','http://localhost:3000', 'https://app-enigma-frontend-kt0gd0i5h-h40040s-projects.vercel.app', 'https://app-enigma-frontend-tif22ff8r-h40040s-projects.vercel.app']
    }
  },
  crossOriginEmbedderPolicy: false, // For compatibility with external resources
  crossOriginResourcePolicy: { policy: 'cross-origin' } // Allow cross-origin resource sharing
})); 
app.use(compression()); // Comprime as respostas
// Debug middleware para capturar body raw
app.use('/api/auth/verify-user', (req, res, next) => {
  let body = '';
  req.on('data', chunk => {
    body += chunk.toString();
  });
  req.on('end', () => {
    console.log('[DEBUG] Raw body received:', body);
    console.log('[DEBUG] Content-Type:', req.headers['content-type']);
    // Restaurar o body para o próximo middleware
    req.body = body;
    next();
  });
});

app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));
app.use(cookieParser(process.env.COOKIE_SECRET)); // Para processar cookies
app.use(mongoSanitize()); // Prevent NoSQL Injection
app.use(xss()); // Clean user input
app.use(hpp()); // Prevent HTTP Parameter Pollution

// Configuração de CORS mais segura
const corsOptions = {
  origin: [process.env.FRONTEND_URL, 'https://app-enigma-frontend-git-develop-h40040s-projects.vercel.app','https://app-enigma-frontend-gysrr1xya-h40040s-projects.vercel.app', 'https://app-enigma-frontend-kt0gd0i5h-h40040s-projects.vercel.app', 'https://app-enigma-frontend-tif22ff8r-h40040s-projects.vercel.app', 'http://192.168.1.91:3000', 'http://localhost:8080', 'http://127.0.0.1:8080', 'http://localhost:8081', 'http://127.0.0.1:8081'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Accept', 'Authorization']
};
app.use(cors(corsOptions));

// Aplicar rate limiters específicos
app.use('/api/', customApiLimiter); // Rate limiter geral
app.use('/api/auth/login', authLimiter); // Rate limiter para login
app.use('/api/register', authLimiter); // Rate limiter para registro
app.use('/api/auth/change-password', passwordChangeLimiter); // Rate limiter para mudança de senha
app.use('/api/validate-cpf', validationLimiter); // Rate limiter para validação CPF
app.use('/api/validate-whatsapp', validationLimiter); // Rate limiter para validação WhatsApp
app.use('/api/messages', messageLimiter); // Rate limiter para mensagens

// Serviço de arquivos estáticos com CORS liberado corretamente
app.use('/uploads', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
}, express.static(path.join(__dirname, 'uploads')));

// Rota protegida para teste
app.get('/api/protected', authenticateToken, checkSessionActivity, trackUserActivity, (req, res) => {
  res.json({ message: 'Acesso autorizado', user: req.user });
});

// Setup CSRF protection (except for auth routes that need special handling)
const csrfProtection = csurf({ 
  cookie: { 
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  }
});

// Rotas importadas
app.use('/api', register);
app.use('/api/auth', auth); // Rota de autenticação
app.use('/api', dashboard);
app.use('/api/interactions', interaction);
app.use('/api/hints', hintRoutes);
app.use('/api/users', userRoutes);
app.use('/api/messages', messageRoutes); // Add this line
app.use('/api', validateRoutes);

// Configuração do multer com validações
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir);
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueSuffix}${ext}`);
  }
});

// Configuração melhorada do multer com limites de tamanho
const upload = multer({ 
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // Limite de 5MB
    files: 1 // Apenas 1 arquivo por vez
  },
  fileFilter: (req, file, cb) => {
    // Verificar tipos de arquivo permitidos
    const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'video/mp4', 'audio/mp3'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de arquivo não suportado'), false);
    }
  }
});

// Movendo rotas para arquivos separados, mantendo apenas a lógica essencial aqui

// Rota de upload com autenticação
app.post('/api/upload', authenticateToken, checkSessionActivity, trackUserActivity, upload.single('media'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    }
    
    // Gera a URL do arquivo usando o IP da máquina, nunca localhost
    // Certifique-se de que SERVER_IP está definido corretamente no .env ou use o IP fixo da sua máquina na rede
    const serverIp = process.env.SERVER_IP || req.hostname || req.connection.localAddress || '192.168.1.91';
    const protocol = req.protocol;
    // Força o IP correto se req.hostname for 'localhost'
    const finalIp = (serverIp === 'localhost' || serverIp === '127.0.0.1') ? '192.168.1.91' : serverIp;
    const fileUrl = `${protocol}://${finalIp}:4000/uploads/${req.file.filename}`;
      
    res.json({ url: fileUrl });
  } catch (error) {
    console.error('Erro ao fazer upload:', error);
    res.status(500).json({ error: 'Erro ao processar upload', details: error.message });
  }
});

// Rota de saúde para testes automatizados
app.get('/', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'API online' });
});

// Health check endpoint for monitoring
app.get('/api/health', async (req, res) => {
  try {
    // Quick database check
    await prisma.$queryRaw`SELECT 1`;
    
    const healthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024)
      },
      environment: process.env.NODE_ENV || 'development',
      version: require('./package.json').version
    };
    
    res.status(200).json(healthStatus);
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

// Middleware global de tratamento de erros
app.use((err, req, res, next) => {
  console.error('Erro global:', err);
  res.status(500).json({ 
    error: 'Erro interno do servidor',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Algo deu errado'
  });
});

// Iniciar o servidor apenas se este arquivo for executado diretamente
if (require.main === module) {
  const PORT = process.env.PORT || 4000;
  app.listen(PORT, () => console.log(`Servidor backend rodando na porta ${PORT}`));
}

module.exports = app;
