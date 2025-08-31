# 🚀 Guia Completo de CI/CD - Enigma Crush Backend

Este guia detalha a configuração e uso do pipeline de CI/CD com GitHub Actions para deploy automático no Render.

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Pré-requisitos](#pré-requisitos)
3. [Configuração Inicial](#configuração-inicial)
4. [GitHub Secrets](#github-secrets)
5. [Workflow do Pipeline](#workflow-do-pipeline)
6. [Testes Automatizados](#testes-automatizados)
7. [Deploy Automático](#deploy-automático)
8. [Monitoramento](#monitoramento)
9. [Troubleshooting](#troubleshooting)
10. [Otimizações](#otimizações)

---

## 🎯 Visão Geral

O pipeline de CI/CD automatiza:

- ✅ **Testes unitários e integração**
- 🔍 **Análise de qualidade de código**
- 🛡️ **Auditoria de segurança**
- 🐳 **Build e teste de container Docker**
- 🚀 **Deploy automático no Render**
- 🔗 **Testes de integração pós-deploy**
- ⚡ **Testes de performance**
- 📊 **Relatórios e notificações**

---

## 📚 Pré-requisitos

### Contas e Serviços
- [x] Conta no GitHub
- [x] Conta no Render
- [x] Conta no Supabase (para database)
- [x] Repositório configurado

### Configurações Locais
- [x] Node.js 18+
- [x] Docker (para testes locais)
- [x] Git configurado

---

## ⚙️ Configuração Inicial

### 1. Estrutura de Arquivos

O pipeline utiliza os seguintes arquivos:

```
enigma-crush-backend/
├── .github/
│   └── workflows/
│       └── backend-deploy.yml     # Pipeline principal
├── scripts/
│   └── setup-github-secrets.js    # Script de configuração
├── artillery.yml                   # Configuração de testes de carga
├── test-data.csv                  # Dados para testes
├── Dockerfile                     # Container de produção
├── render.yaml                    # Configuração do Render
└── package.json                   # Scripts e dependências
```

### 2. Scripts de Configuração

```bash
# Executar script de configuração
node scripts/setup-github-secrets.js all

# Comandos específicos
node scripts/setup-github-secrets.js secrets   # Guia de secrets
node scripts/setup-github-secrets.js env       # Template de .env
node scripts/setup-github-secrets.js validate  # Validar configuração
node scripts/setup-github-secrets.js render    # Guia do Render
```

---

## 🔐 GitHub Secrets

### Secrets Obrigatórios

Configure em: `https://github.com/SEU_USUARIO/SEU_REPO/settings/secrets/actions`

| Secret | Descrição | Exemplo |
|--------|-----------|----------|
| `RENDER_SERVICE_ID` | ID do serviço no Render | `srv-xxxxxxxxxxxxxxxxxx` |
| `RENDER_API_KEY` | API Key do Render | `rnd_xxxxxxxxxxxxxxxx` |
| `BACKEND_URL` | URL do backend em produção | `https://enigma-crush-backend.onrender.com` |
| `DATABASE_URL` | URL do PostgreSQL | `postgresql://user:pass@host:5432/db` |
| `JWT_SECRET` | Secret para JWT | `base64-encoded-secret` |
| `CORS_ORIGIN` | URL do frontend | `https://enigma-crush.vercel.app` |

### Secrets Opcionais

| Secret | Descrição | Uso |
|--------|-----------|-----|
| `SUPABASE_URL` | URL do Supabase | Migrações automáticas |
| `SUPABASE_ANON_KEY` | Chave anônima | Testes de integração |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave de admin | Migrações e seeds |

### Como Obter os Secrets

#### Render API Key
1. Acesse [Render Dashboard](https://dashboard.render.com)
2. Vá em **Account Settings** > **API Keys**
3. Clique em **Create API Key**
4. Copie a chave gerada

#### Render Service ID
1. Acesse seu serviço no Render
2. Na URL, copie o ID: `https://dashboard.render.com/web/srv-XXXXXXXXX`
3. O Service ID é `srv-XXXXXXXXX`

#### JWT Secret
```bash
# Gerar JWT Secret seguro
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

---

## 🔄 Workflow do Pipeline

### Triggers

O pipeline é executado quando:

- 🔄 **Push** para `main` ou `master`
- 🔄 **Pull Request** para `main` ou `master`
- 🔄 **Mudanças** em arquivos do backend
- 🔄 **Execução manual** via GitHub Actions

### Jobs do Pipeline

#### 1. 🧪 Backend Tests
```yaml
# Executa testes unitários e de integração
- Instala dependências
- Configura PostgreSQL de teste
- Executa migrações
- Roda testes com Jest
- Gera relatório de cobertura
```

#### 2. 🔍 Code Quality
```yaml
# Análise de qualidade e segurança
- ESLint para padrões de código
- Auditoria de segurança (npm audit)
- Verificação de vulnerabilidades
```

#### 3. 🐳 Docker Build
```yaml
# Build e teste do container
- Build da imagem Docker
- Teste de inicialização
- Verificação de health check
```

#### 4. 🚀 Deploy to Render
```yaml
# Deploy automático (apenas em push para main)
- Trigger de deploy via API do Render
- Aguarda conclusão do deploy
```

#### 5. 🔗 Integration Tests
```yaml
# Testes pós-deploy
- Health check da aplicação
- Teste de endpoints de autenticação
- Verificação de conexão com database
```

#### 6. ⚡ Performance Tests
```yaml
# Testes de carga com Artillery
- Teste de carga gradual
- Verificação de tempo de resposta
- Análise de throughput
```

#### 7. 📢 Notifications
```yaml
# Notificações de resultado
- Sucesso: URL da aplicação
- Falha: Logs de erro
```

---

## 🧪 Testes Automatizados

### Tipos de Teste

#### Testes Unitários
```bash
# Executar localmente
npm test
npm run test:coverage
```

#### Testes de Integração
```bash
# Com database de teste
npm run test:integration
```

#### Testes de Carga
```bash
# Instalar Artillery
npm install -g artillery

# Executar testes locais
artillery run artillery.yml

# Testes em produção
artillery run artillery.yml --environment production
```

### Configuração de Testes

#### Jest Configuration
```javascript
// jest.config.js
module.exports = {
  testEnvironment: 'node',
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  testMatch: ['**/tests/**/*.test.js'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js']
};
```

#### Artillery Configuration
```yaml
# artillery.yml
config:
  target: 'http://localhost:4006'
  phases:
    - duration: 60
      arrivalRate: 5
  ensure:
    p95: 500
    maxErrorRate: 5
```

---

## 🚀 Deploy Automático

### Fluxo de Deploy

1. **Commit** → Push para `main`
2. **Trigger** → GitHub Actions inicia pipeline
3. **Tests** → Executa todos os testes
4. **Quality** → Verifica qualidade do código
5. **Build** → Constrói imagem Docker
6. **Deploy** → Envia para Render
7. **Verify** → Testa aplicação em produção

### Deploy Manual

```bash
# Via GitHub Actions
# 1. Vá para Actions tab no GitHub
# 2. Selecione "Backend Deploy to Render"
# 3. Clique em "Run workflow"
# 4. Selecione a branch
# 5. Clique em "Run workflow"
```

### Rollback

```bash
# Via Render Dashboard
# 1. Acesse o serviço no Render
# 2. Vá para "Deploys"
# 3. Clique em "Rollback" no deploy anterior

# Via API do Render
curl -X POST \
  https://api.render.com/v1/services/YOUR_SERVICE_ID/deploys/DEPLOY_ID/rollback \
  -H "Authorization: Bearer YOUR_API_KEY"
```

---

## 📊 Monitoramento

### Logs do Pipeline

```bash
# Visualizar logs no GitHub
# 1. Vá para Actions tab
# 2. Clique no workflow executado
# 3. Clique no job específico
# 4. Expanda os steps para ver logs
```

### Logs da Aplicação

```bash
# Via Render Dashboard
# 1. Acesse o serviço
# 2. Vá para "Logs"
# 3. Filtre por tipo de log

# Via CLI do Render
render logs --service YOUR_SERVICE_ID --follow
```

### Métricas

#### GitHub Actions
- ⏱️ Tempo de execução dos jobs
- ✅ Taxa de sucesso dos deploys
- 📊 Cobertura de testes
- 🐛 Falhas por categoria

#### Render
- 🚀 Tempo de deploy
- 💾 Uso de memória
- 🔄 CPU utilization
- 🌐 Response time

#### Artillery Reports
- 📈 Requests per second
- ⏱️ Response time percentiles
- ❌ Error rate
- 🎯 Throughput

---

## 🔧 Troubleshooting

### Problemas Comuns

#### ❌ Falha nos Testes
```bash
# Verificar logs do teste
npm test -- --verbose

# Executar teste específico
npm test -- tests/routes/auth.test.js

# Debug com logs
DEBUG=* npm test
```

#### ❌ Falha no Build Docker
```bash
# Testar build local
docker build -t enigma-crush-backend:test .

# Verificar logs do container
docker run --rm enigma-crush-backend:test

# Debug interativo
docker run -it --rm enigma-crush-backend:test /bin/sh
```

#### ❌ Falha no Deploy
```bash
# Verificar secrets do GitHub
# 1. Vá para Settings > Secrets
# 2. Verifique se todos os secrets estão configurados
# 3. Teste a API key do Render

curl -H "Authorization: Bearer YOUR_API_KEY" \
  https://api.render.com/v1/services
```

#### ❌ Falha nos Testes de Integração
```bash
# Verificar se o serviço está rodando
curl -f https://your-backend-url.onrender.com/health

# Verificar logs do Render
render logs --service YOUR_SERVICE_ID --tail 100

# Testar endpoints manualmente
curl -X POST https://your-backend-url.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test"}'
```

### Debug Avançado

#### Executar Pipeline Localmente
```bash
# Instalar act (GitHub Actions local)
curl https://raw.githubusercontent.com/nektos/act/master/install.sh | sudo bash

# Executar workflow local
act -j backend-tests
```

#### Simular Ambiente de Produção
```bash
# Docker Compose para ambiente completo
docker-compose -f docker-compose.prod.yml up

# Testar com dados de produção
DATABASE_URL="your-prod-db-url" npm test
```

---

## ⚡ Otimizações

### Performance do Pipeline

#### Cache de Dependências
```yaml
# Já configurado no workflow
- uses: actions/setup-node@v4
  with:
    cache: 'npm'
    cache-dependency-path: package-lock.json
```

#### Paralelização
```yaml
# Jobs executam em paralelo quando possível
jobs:
  backend-tests:
    # ...
  code-quality:
    # Executa em paralelo com backend-tests
    # ...
```

#### Otimização de Docker
```dockerfile
# Multi-stage build já implementado
FROM node:18-alpine AS builder
# Build stage

FROM node:18-alpine AS production
# Production stage
```

### Redução de Custos

#### Execução Condicional
```yaml
# Deploy apenas em push para main
if: github.event_name == 'push' && github.ref == 'refs/heads/main'
```

#### Timeout Configurado
```yaml
# Evita jobs infinitos
timeout-minutes: 30
```

### Segurança

#### Secrets Management
- ✅ Usar apenas GitHub Secrets
- ✅ Rotacionar chaves regularmente
- ✅ Princípio do menor privilégio
- ✅ Auditoria de acesso

#### Container Security
```dockerfile
# Usuário não-root
USER enigma

# Imagem minimal
FROM node:18-alpine

# Scan de vulnerabilidades
RUN npm audit --audit-level=moderate
```

---

## 📚 Recursos Adicionais

### Documentação
- [GitHub Actions](https://docs.github.com/en/actions)
- [Render Deploy](https://render.com/docs/deploys)
- [Artillery.js](https://artillery.io/docs/)
- [Jest Testing](https://jestjs.io/docs/getting-started)

### Ferramentas
- [GitHub CLI](https://cli.github.com/)
- [Render CLI](https://render.com/docs/cli)
- [Docker](https://docs.docker.com/)
- [Artillery](https://artillery.io/)

### Monitoramento
- [Render Metrics](https://render.com/docs/metrics)
- [GitHub Insights](https://docs.github.com/en/repositories/viewing-activity-and-data-for-your-repository/viewing-a-summary-of-repository-activity)
- [Uptime Monitoring](https://uptimerobot.com/)

---

## 🎯 Próximos Passos

1. **Configurar Secrets** → Execute `node scripts/setup-github-secrets.js secrets`
2. **Testar Pipeline** → Faça um commit e push
3. **Monitorar Deploy** → Acompanhe no GitHub Actions
4. **Validar Produção** → Teste a aplicação deployada
5. **Configurar Alertas** → Setup de notificações

---

**🚀 Seu backend está pronto para deploy automático!**

Para dúvidas ou problemas, consulte a seção de [Troubleshooting](#troubleshooting) ou abra uma issue no repositório.