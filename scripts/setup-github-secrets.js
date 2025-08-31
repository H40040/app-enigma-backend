#!/usr/bin/env node

/**
 * Script para configurar secrets do GitHub Actions
 * Este script ajuda a configurar as variáveis de ambiente necessárias
 * para o deploy automático no Render e testes de integração
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Cores para output no terminal
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function generateSecureSecret(length = 64) {
  return crypto.randomBytes(length).toString('hex');
}

function generateJWTSecret() {
  return crypto.randomBytes(32).toString('base64');
}

function displayGitHubSecretsGuide() {
  log('\n🔐 CONFIGURAÇÃO DE SECRETS DO GITHUB ACTIONS', 'bright');
  log('=' .repeat(60), 'cyan');
  
  log('\n📋 SECRETS OBRIGATÓRIOS:', 'yellow');
  log('\nVá para: https://github.com/SEU_USUARIO/SEU_REPOSITORIO/settings/secrets/actions\n');
  
  const secrets = [
    {
      name: 'RENDER_SERVICE_ID',
      description: 'ID do serviço no Render (encontre em: Render Dashboard > Service > Settings)',
      example: 'srv-xxxxxxxxxxxxxxxxxx',
      required: true
    },
    {
      name: 'RENDER_API_KEY',
      description: 'API Key do Render (crie em: Render Dashboard > Account Settings > API Keys)',
      example: 'rnd_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
      required: true
    },
    {
      name: 'BACKEND_URL',
      description: 'URL do backend em produção no Render',
      example: 'https://enigma-crush-backend.onrender.com',
      required: true
    },
    {
      name: 'DATABASE_URL',
      description: 'URL de conexão com PostgreSQL (Supabase ou Render)',
      example: 'postgresql://user:password@host:5432/database',
      required: true
    },
    {
      name: 'JWT_SECRET',
      description: 'Secret para assinatura de tokens JWT',
      example: generateJWTSecret(),
      required: true
    },
    {
      name: 'CORS_ORIGIN',
      description: 'URL do frontend para configuração de CORS',
      example: 'https://enigma-crush.vercel.app',
      required: true
    },
    {
      name: 'SUPABASE_URL',
      description: 'URL do projeto Supabase',
      example: 'https://xxxxxxxxxxxxxxxxxx.supabase.co',
      required: false
    },
    {
      name: 'SUPABASE_ANON_KEY',
      description: 'Chave anônima do Supabase',
      example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
      required: false
    },
    {
      name: 'SUPABASE_SERVICE_ROLE_KEY',
      description: 'Chave de service role do Supabase (para migrações)',
      example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
      required: false
    }
  ];
  
  secrets.forEach((secret, index) => {
    const status = secret.required ? '🔴 OBRIGATÓRIO' : '🟡 OPCIONAL';
    log(`\n${index + 1}. ${secret.name}`, 'bright');
    log(`   ${status}`, secret.required ? 'red' : 'yellow');
    log(`   📝 ${secret.description}`, 'cyan');
    log(`   💡 Exemplo: ${secret.example}`, 'magenta');
  });
  
  log('\n🚀 COMO CONFIGURAR:', 'yellow');
  log('\n1. Acesse: https://github.com/SEU_USUARIO/SEU_REPOSITORIO/settings/secrets/actions');
  log('2. Clique em "New repository secret"');
  log('3. Digite o nome do secret (ex: RENDER_API_KEY)');
  log('4. Cole o valor correspondente');
  log('5. Clique em "Add secret"');
  log('6. Repita para todos os secrets obrigatórios\n');
  
  log('⚠️  IMPORTANTE:', 'red');
  log('- Nunca commite secrets no código!');
  log('- Use apenas secrets do GitHub Actions para CI/CD');
  log('- Mantenha as chaves seguras e rotacione periodicamente\n');
}

function generateEnvTemplate() {
  log('\n📄 GERANDO TEMPLATE DE .env.production...', 'blue');
  
  const envTemplate = `# Enigma Crush Backend - Production Environment Variables
# Este arquivo serve como template para configuração de produção
# NUNCA commite este arquivo com valores reais!

# === CONFIGURAÇÕES BÁSICAS ===
NODE_ENV=production
PORT=4006

# === DATABASE ===
# PostgreSQL connection string (Supabase ou Render)
DATABASE_URL="postgresql://username:password@host:5432/database_name"

# === AUTENTICAÇÃO ===
# JWT Secret (use: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))")
JWT_SECRET="${generateJWTSecret()}"
JWT_EXPIRES_IN="7d"

# === CORS ===
# URL do frontend em produção
CORS_ORIGIN="https://enigma-crush.vercel.app"

# === SUPABASE (se usando) ===
SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_ANON_KEY="your-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# === PRISMA ===
PRISMA_QUERY_ENGINE_LIBRARY="/opt/render/project/src/node_modules/.prisma/client/libquery_engine-rhel-openssl-1.0.x.so.node"

# === RATE LIMITING ===
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# === LOGGING ===
LOG_LEVEL="info"

# === HEALTH CHECK ===
HEALTH_CHECK_ENABLED=true

# === SECURITY ===
# Gerado automaticamente: ${generateSecureSecret(32)}
SESSION_SECRET="${generateSecureSecret(32)}"

# === API EXTERNA (se usando) ===
# APIGRATIS_TOKEN="your-apigratis-token"
# WHATSAPP_API_URL="https://api.apigratis.com.br"
`;
  
  const envPath = path.join(__dirname, '..', '.env.production.template');
  fs.writeFileSync(envPath, envTemplate);
  
  log(`✅ Template criado em: ${envPath}`, 'green');
  log('💡 Copie este arquivo para .env.production e preencha com valores reais', 'yellow');
}

function validateCurrentEnv() {
  log('\n🔍 VALIDANDO CONFIGURAÇÃO ATUAL...', 'blue');
  
  const envFiles = ['.env', '.env.production', '.env.example'];
  const requiredVars = [
    'NODE_ENV',
    'PORT',
    'DATABASE_URL',
    'JWT_SECRET',
    'CORS_ORIGIN'
  ];
  
  envFiles.forEach(envFile => {
    const envPath = path.join(__dirname, '..', envFile);
    
    if (fs.existsSync(envPath)) {
      log(`\n📄 Verificando ${envFile}:`, 'cyan');
      
      const envContent = fs.readFileSync(envPath, 'utf8');
      const envLines = envContent.split('\n').filter(line => 
        line.trim() && !line.startsWith('#')
      );
      
      const envVars = {};
      envLines.forEach(line => {
        const [key, value] = line.split('=');
        if (key && value) {
          envVars[key.trim()] = value.trim();
        }
      });
      
      requiredVars.forEach(varName => {
        if (envVars[varName]) {
          log(`   ✅ ${varName}: configurado`, 'green');
        } else {
          log(`   ❌ ${varName}: FALTANDO`, 'red');
        }
      });
    } else {
      log(`\n📄 ${envFile}: não encontrado`, 'yellow');
    }
  });
}

function generateRenderConfig() {
  log('\n🐳 CONFIGURAÇÃO DO RENDER', 'blue');
  log('\nPara configurar o deploy no Render:');
  log('\n1. Acesse: https://dashboard.render.com/');
  log('2. Clique em "New" > "Web Service"');
  log('3. Conecte seu repositório GitHub');
  log('4. Configure:');
  log('   - Name: enigma-crush-backend');
  log('   - Environment: Docker');
  log('   - Build Command: (deixe vazio - usa Dockerfile)');
  log('   - Start Command: (deixe vazio - usa Dockerfile)');
  log('\n5. Adicione as variáveis de ambiente:');
  
  const renderVars = [
    'NODE_ENV=production',
    'PORT=4006',
    'DATABASE_URL=<sua-database-url>',
    'JWT_SECRET=<seu-jwt-secret>',
    'CORS_ORIGIN=<url-do-frontend>'
  ];
  
  renderVars.forEach(varExample => {
    log(`   - ${varExample}`, 'magenta');
  });
  
  log('\n6. Clique em "Create Web Service"');
  log('\n7. Copie o Service ID da URL (srv-xxxxxxxxx) para o GitHub Secret RENDER_SERVICE_ID');
}

function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  log('🚀 ENIGMA CRUSH - CONFIGURAÇÃO DE DEPLOY', 'bright');
  log('=' .repeat(50), 'cyan');
  
  switch (command) {
    case 'secrets':
      displayGitHubSecretsGuide();
      break;
    
    case 'env':
      generateEnvTemplate();
      break;
    
    case 'validate':
      validateCurrentEnv();
      break;
    
    case 'render':
      generateRenderConfig();
      break;
    
    case 'all':
      displayGitHubSecretsGuide();
      generateEnvTemplate();
      validateCurrentEnv();
      generateRenderConfig();
      break;
    
    default:
      log('\n📋 COMANDOS DISPONÍVEIS:', 'yellow');
      log('\nnode scripts/setup-github-secrets.js [comando]\n');
      log('Comandos:');
      log('  secrets  - Mostra guia de configuração de GitHub Secrets');
      log('  env      - Gera template de .env.production');
      log('  validate - Valida configuração atual');
      log('  render   - Mostra guia de configuração do Render');
      log('  all      - Executa todos os comandos acima\n');
      log('Exemplo: node scripts/setup-github-secrets.js secrets');
      break;
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  generateSecureSecret,
  generateJWTSecret,
  displayGitHubSecretsGuide,
  generateEnvTemplate,
  validateCurrentEnv,
  generateRenderConfig
};