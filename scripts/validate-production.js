#!/usr/bin/env node

/**
 * 🧪 Script de Validação de Deploy em Produção
 * 
 * Este script automatiza a validação do deploy da aplicação Enigma Crush
 * em ambiente de produção, testando todos os componentes críticos.
 */

const https = require('https');
const http = require('http');
const { URL } = require('url');
const fs = require('fs');
const path = require('path');

// Configurações
const config = {
  frontend: {
    url: process.env.FRONTEND_URL || 'https://your-app.vercel.app',
    timeout: 10000
  },
  backend: {
    url: process.env.BACKEND_URL || 'https://your-backend.onrender.com',
    timeout: 10000
  },
  database: {
    url: process.env.DATABASE_URL || '',
    timeout: 5000
  },
  testUser: {
    email: process.env.TEST_USER_EMAIL || 'test@enigmacrush.com',
    password: process.env.TEST_USER_PASSWORD || 'TestPassword123!',
    name: 'Test User Production'
  }
};

// Cores para output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

// Utilitários
const log = {
  info: (msg) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  warning: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  step: (msg) => console.log(`${colors.cyan}🔄 ${msg}${colors.reset}`)
};

// Função para fazer requisições HTTP/HTTPS
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const client = isHttps ? https : http;
    
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        'User-Agent': 'Enigma-Crush-Production-Validator/1.0',
        'Accept': 'application/json',
        ...options.headers
      },
      timeout: options.timeout || 10000
    };

    const req = client.request(requestOptions, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const jsonData = data ? JSON.parse(data) : {};
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: jsonData,
            rawData: data
          });
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: null,
            rawData: data
          });
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (options.body) {
      req.write(JSON.stringify(options.body));
    }

    req.end();
  });
}

// Testes individuais
class ProductionValidator {
  constructor() {
    this.results = {
      passed: 0,
      failed: 0,
      warnings: 0,
      tests: []
    };
    this.authToken = null;
    this.testEmail = `test-${Date.now()}-${Math.random().toString(36).substring(7)}@enigmacrush.com`;
    this.testCpf = this.generateValidCPF();
  }

  generateValidCPF() {
    // Gera os 9 primeiros dígitos aleatoriamente
    const digits = [];
    for (let i = 0; i < 9; i++) {
      digits.push(Math.floor(Math.random() * 10));
    }

    // Calcula o primeiro dígito verificador
    let sum = 0;
    for (let i = 0; i < 9; i++) {
      sum += digits[i] * (10 - i);
    }
    let firstDigit = 11 - (sum % 11);
    if (firstDigit >= 10) firstDigit = 0;
    digits.push(firstDigit);

    // Calcula o segundo dígito verificador
    sum = 0;
    for (let i = 0; i < 10; i++) {
      sum += digits[i] * (11 - i);
    }
    let secondDigit = 11 - (sum % 11);
    if (secondDigit >= 10) secondDigit = 0;
    digits.push(secondDigit);

    return digits.join('');
  }

  async runTest(name, testFn) {
    log.step(`Executando: ${name}`);
    
    try {
      const result = await testFn();
      
      if (result.success) {
        log.success(`${name} - ${result.message || 'Passou'}`);
        this.results.passed++;
      } else if (result.warning) {
        log.warning(`${name} - ${result.message || 'Aviso'}`);
        this.results.warnings++;
      } else {
        log.error(`${name} - ${result.message || 'Falhou'}`);
        this.results.failed++;
      }
      
      this.results.tests.push({
        name,
        success: result.success,
        warning: result.warning,
        message: result.message,
        details: result.details
      });
      
    } catch (error) {
      log.error(`${name} - Erro: ${error.message}`);
      this.results.failed++;
      this.results.tests.push({
        name,
        success: false,
        message: error.message,
        details: error.stack
      });
    }
  }

  // Teste 1: Frontend Health Check
  async testFrontendHealth() {
    const response = await makeRequest(config.frontend.url, {
      timeout: config.frontend.timeout
    });

    if (response.statusCode === 200) {
      return {
        success: true,
        message: `Frontend acessível (${response.statusCode})`,
        details: { url: config.frontend.url, statusCode: response.statusCode }
      };
    } else {
      return {
        success: false,
        message: `Frontend retornou status ${response.statusCode}`,
        details: { url: config.frontend.url, statusCode: response.statusCode }
      };
    }
  }

  // Teste 2: Backend Health Check
  async testBackendHealth() {
    const healthUrl = `${config.backend.url}/api/health`;
    const response = await makeRequest(healthUrl, {
      timeout: config.backend.timeout
    });

    if (response.statusCode === 200 && response.data) {
      const health = response.data;
      
      if (health.status === 'healthy') {
        return {
          success: true,
          message: `Backend saudável (uptime: ${health.uptime || 'N/A'})`,
          details: health
        };
      } else {
        return {
          success: false,
          message: `Backend não está saudável: ${health.status}`,
          details: health
        };
      }
    } else {
      return {
        success: false,
        message: `Health check falhou (${response.statusCode})`,
        details: { statusCode: response.statusCode, data: response.data }
      };
    }
  }

  // Teste 3: Database Connectivity
  async testDatabaseConnectivity() {
    const dbHealthUrl = `${config.backend.url}/api/health`;
    
    try {
      const response = await makeRequest(dbHealthUrl, {
        timeout: config.database.timeout
      });

      if (response.statusCode === 200 && response.data) {
        const dbHealth = response.data;
        
        if (dbHealth.status === 'healthy') {
          return {
            success: true,
            message: `Database conectado via health check`,
            details: dbHealth
          };
        } else {
          return {
            success: false,
            message: 'Database não conectado ou com problemas',
            details: dbHealth
          };
        }
      } else {
        return {
          success: false,
          message: `Teste de database falhou (${response.statusCode})`,
          details: { statusCode: response.statusCode }
        };
      }
    } catch (error) {
      return {
        success: false,
        message: `Erro ao testar database: ${error.message}`,
        details: { error: error.message }
      };
    }
  }

  // Teste 4: User Registration
  async testUserRegistration() {
    const registerUrl = `${config.backend.url}/api/register`;
    
    const response = await makeRequest(registerUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: {
        email: this.testEmail,
        password: config.testUser.password,
        name: config.testUser.name,
        birthdate: '1990-01-01',
        cpf: this.testCpf
      },
      timeout: config.backend.timeout
    });

    if (response.statusCode === 201 && response.data && response.data.success) {
      return {
        success: true,
        message: 'Registro de usuário funcionando',
        details: { email: this.testEmail, userId: response.data.user?.id }
      };
    } else {
      return {
        success: false,
        message: `Registro falhou (${response.statusCode})`,
        details: { statusCode: response.statusCode, data: response.data }
      };
    }
  }

  // Teste 5: User Login
  async testUserLogin() {
    const loginUrl = `${config.backend.url}/api/auth/verify-user`;
    
    const response = await makeRequest(loginUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: {
        email: this.testEmail,
        password: config.testUser.password
      },
      timeout: config.backend.timeout
    });

    if (response.statusCode === 200 && response.data && response.data.accessToken) {
      this.authToken = response.data.accessToken;
      return {
        success: true,
        message: 'Login funcionando',
        details: { hasToken: !!response.data.accessToken }
      };
    } else {
      return {
        success: false,
        message: `Login falhou (${response.statusCode})`,
        details: { statusCode: response.statusCode, data: response.data }
      };
    }
  }

  // Teste 6: Protected Endpoint
  async testProtectedEndpoint() {
    if (!this.authToken) {
      return {
        success: false,
        message: 'Token de autenticação não disponível',
        details: { reason: 'Login test failed or not executed' }
      };
    }

    const profileUrl = `${config.backend.url}/api/auth/profile`;
    
    const response = await makeRequest(profileUrl, {
      headers: {
        'Authorization': `Bearer ${this.authToken}`
      },
      timeout: config.backend.timeout
    });

    if (response.statusCode === 200 && response.data) {
      return {
        success: true,
        message: 'Endpoints protegidos funcionando',
        details: { userId: response.data.id }
      };
    } else {
      return {
        success: false,
        message: `Endpoint protegido falhou (${response.statusCode})`,
        details: { statusCode: response.statusCode }
      };
    }
  }

  // Teste 7: CORS Configuration
  async testCorsConfiguration() {
    const corsUrl = `${config.backend.url}/api/auth/verify-user`;
    
    const response = await makeRequest(corsUrl, {
      method: 'OPTIONS',
      headers: {
        'Origin': config.frontend.url,
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type'
      },
      timeout: config.backend.timeout
    });

    const corsHeaders = response.headers;
    const hasAccessControlOrigin = corsHeaders['access-control-allow-origin'];
    const hasAccessControlMethods = corsHeaders['access-control-allow-methods'];

    if (hasAccessControlOrigin && hasAccessControlMethods) {
      return {
        success: true,
        message: 'CORS configurado corretamente',
        details: {
          origin: hasAccessControlOrigin,
          methods: hasAccessControlMethods
        }
      };
    } else {
      return {
        warning: true,
        message: 'CORS pode não estar configurado corretamente',
        details: { corsHeaders }
      };
    }
  }

  // Teste 8: Security Headers
  async testSecurityHeaders() {
    const response = await makeRequest(`${config.backend.url}/health`, {
      timeout: config.backend.timeout
    });

    const headers = response.headers;
    const securityHeaders = {
      'x-content-type-options': headers['x-content-type-options'],
      'x-frame-options': headers['x-frame-options'],
      'x-xss-protection': headers['x-xss-protection'],
      'strict-transport-security': headers['strict-transport-security']
    };

    const missingHeaders = Object.entries(securityHeaders)
      .filter(([key, value]) => !value)
      .map(([key]) => key);

    if (missingHeaders.length === 0) {
      return {
        success: true,
        message: 'Headers de segurança configurados',
        details: securityHeaders
      };
    } else {
      return {
        warning: true,
        message: `Headers de segurança faltando: ${missingHeaders.join(', ')}`,
        details: { missing: missingHeaders, present: securityHeaders }
      };
    }
  }

  // Teste 9: Rate Limiting
  async testRateLimiting() {
    const testUrl = `${config.backend.url}/api/auth/verify-user`;
    const requests = [];
    
    // Fazer múltiplas requisições rapidamente
    for (let i = 0; i < 15; i++) {
      requests.push(
        makeRequest(testUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: { email: 'invalid@test.com', password: 'invalid' },
          timeout: 5000
        }).catch(err => ({ error: err.message }))
      );
    }

    const responses = await Promise.all(requests);
    const rateLimitedResponses = responses.filter(r => r.statusCode === 429);

    if (rateLimitedResponses.length > 0) {
      return {
        success: true,
        message: `Rate limiting ativo (${rateLimitedResponses.length}/15 bloqueadas)`,
        details: { blocked: rateLimitedResponses.length, total: 15 }
      };
    } else {
      return {
        warning: true,
        message: 'Rate limiting pode não estar configurado',
        details: { blocked: 0, total: 15 }
      };
    }
  }

  // Executar todos os testes
  async runAllTests() {

    // Executar testes em sequência
    await this.runTest('Frontend Health Check', () => this.testFrontendHealth());
    await this.runTest('Backend Health Check', () => this.testBackendHealth());
    await this.runTest('Database Connectivity', () => this.testDatabaseConnectivity());
    await this.runTest('User Registration', () => this.testUserRegistration());
    await this.runTest('User Login', () => this.testUserLogin());
    await this.runTest('Protected Endpoint', () => this.testProtectedEndpoint());
    await this.runTest('CORS Configuration', () => this.testCorsConfiguration());
    await this.runTest('Security Headers', () => this.testSecurityHeaders());
    await this.runTest('Rate Limiting', () => this.testRateLimiting());

    // Relatório final
    this.generateReport();
  }

  generateReport() {
    console.log(`\n${colors.magenta}📊 Relatório de Validação${colors.reset}`);
    console.log('='.repeat(50));
    
    console.log(`${colors.green}✅ Testes Passaram: ${this.results.passed}${colors.reset}`);
    console.log(`${colors.yellow}⚠️  Avisos: ${this.results.warnings}${colors.reset}`);
    console.log(`${colors.red}❌ Testes Falharam: ${this.results.failed}${colors.reset}`);
    
    const total = this.results.passed + this.results.warnings + this.results.failed;
    const successRate = ((this.results.passed / total) * 100).toFixed(1);
    
    console.log(`\n📈 Taxa de Sucesso: ${successRate}%`);
    
    // Salvar relatório detalhado
    const reportPath = path.join(__dirname, '..', 'production-validation-report.json');
    const report = {
      timestamp: new Date().toISOString(),
      config,
      results: this.results,
      summary: {
        total,
        passed: this.results.passed,
        warnings: this.results.warnings,
        failed: this.results.failed,
        successRate: parseFloat(successRate)
      }
    };
    
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    log.info(`Relatório detalhado salvo em: ${reportPath}`);
    
    // Status de saída
    if (this.results.failed > 0) {
      console.log(`\n${colors.red}💥 Validação falhou! Verifique os erros acima.${colors.reset}`);
      process.exit(1);
    } else if (this.results.warnings > 0) {
      console.log(`\n${colors.yellow}⚠️  Validação passou com avisos. Revise as configurações.${colors.reset}`);
      process.exit(0);
    } else {
      console.log(`\n${colors.green}🎉 Validação passou completamente! Produção está funcionando perfeitamente.${colors.reset}`);
      process.exit(0);
    }
  }
}

// Executar validação se chamado diretamente
if (require.main === module) {
  // Processar argumentos da linha de comando
  const args = process.argv.slice(2);
  
  if (args.length >= 2) {
    config.frontend.url = args[0];
    config.backend.url = args[1];
  }
  
  // Mostrar configuração atual
  console.log(`${colors.cyan}🧪 Iniciando Validação de Produção - Enigma Crush${colors.reset}\n`);
  console.log(`${colors.blue}ℹ️  Frontend URL: ${config.frontend.url}${colors.reset}`);
  console.log(`${colors.blue}ℹ️  Backend URL: ${config.backend.url}${colors.reset}`);
  console.log(`${colors.blue}ℹ️  Test User: ${config.testUser.email}${colors.reset}\n`);
  
  const validator = new ProductionValidator();
  validator.runAllTests().catch(error => {
    log.error(`Erro fatal na validação: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  });
}

module.exports = ProductionValidator;