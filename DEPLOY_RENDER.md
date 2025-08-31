# 🐳 Deploy Backend no Render - Enigma Crush

## 📋 Pré-requisitos

- [ ] Conta no Render (https://render.com)
- [ ] Repositório Git configurado
- [ ] Dockerfile funcional
- [ ] Schema Prisma configurado

## 🚀 Configuração Rápida

### 1. Conectar Repositório

1. Acesse [Render Dashboard](https://dashboard.render.com)
2. Clique em "New +" > "Web Service"
3. Conecte seu repositório Git
4. Selecione o diretório `enigma-crush-backend`

### 2. Configurações de Deploy

```yaml
# Nome do Serviço
enigma-crush-backend

# Ambiente
Docker

# Dockerfile Path
./Dockerfile

# Build Command
npm ci --only=production && npx prisma generate && npx prisma migrate deploy

# Start Command
npm run start:prod

# Health Check Path
/health
```

### 3. Configurar Banco PostgreSQL

1. No Render Dashboard, clique em "New +" > "PostgreSQL"
2. Configure:
   ```
   Name: enigma-crush-db
   Database: enigma_crush
   User: enigma_user
   Plan: Free
   ```
3. Anote a `DATABASE_URL` gerada

### 4. Variáveis de Ambiente

Configure no Render Dashboard > Environment:

#### 🔧 Configurações Básicas
```bash
NODE_ENV=production
PORT=4006
DATABASE_URL=[URL_DO_POSTGRESQL_RENDER]
```

#### 🔐 Segurança (Gerar valores únicos)
```bash
JWT_SECRET=[GERAR_STRING_ALEATORIA_32_CHARS]
BCRYPT_ROUNDS=12
SESSION_SECRET=[GERAR_STRING_ALEATORIA_32_CHARS]
COOKIE_SECRET=[GERAR_STRING_ALEATORIA_32_CHARS]
ENCRYPTION_KEY=[GERAR_STRING_ALEATORIA_32_CHARS]
API_KEY_SECRET=[GERAR_STRING_ALEATORIA_32_CHARS]
WEBHOOK_SECRET=[GERAR_STRING_ALEATORIA_32_CHARS]
```

#### 🌐 CORS e Frontend
```bash
CORS_ORIGIN=https://your-frontend-domain.vercel.app
FRONTEND_URL=https://your-frontend-domain.vercel.app
```

#### ⚡ Performance e Logs
```bash
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
LOG_LEVEL=info
ENABLE_SWAGGER=false
ENABLE_METRICS=true
```

#### 🗄️ Prisma
```bash
PRISMA_QUERY_ENGINE_LIBRARY=/app/node_modules/.prisma/client/libquery_engine-linux-musl.so.node
```

## 🔧 Scripts de Configuração

### Gerar Secrets
```bash
# Executar localmente para gerar secrets
node -e "console.log('JWT_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"
node -e "console.log('SESSION_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"
node -e "console.log('COOKIE_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"
node -e "console.log('ENCRYPTION_KEY=' + require('crypto').randomBytes(32).toString('hex'))"
node -e "console.log('API_KEY_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"
node -e "console.log('WEBHOOK_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"
```

### Configurar Database
```bash
# Após deploy, executar migrações
npx prisma migrate deploy
npx prisma db seed
```

## 🎯 Deploy Automático

### Via Git Push
```bash
git add .
git commit -m "feat: configure render deployment"
git push origin main
```

### Via Render CLI
```bash
# Instalar Render CLI
npm install -g @render/cli

# Login
render auth login

# Deploy
render deploy
```

## 🔍 Verificação Pós-Deploy

### ✅ Checklist de Validação

- [ ] Serviço está rodando (status: Live)
- [ ] Health check respondendo (/health)
- [ ] Database conectado
- [ ] Migrações aplicadas
- [ ] Logs sem erros críticos
- [ ] CORS configurado corretamente

### 🧪 Testes de API

```bash
# Health Check
curl https://your-backend-url.onrender.com/health

# API Status
curl https://your-backend-url.onrender.com/api/status

# Test CORS
curl -H "Origin: https://your-frontend-domain.vercel.app" \
     -H "Access-Control-Request-Method: GET" \
     -H "Access-Control-Request-Headers: X-Requested-With" \
     -X OPTIONS \
     https://your-backend-url.onrender.com/api/test
```

## 🚨 Troubleshooting

### Erro: "Database connection failed"
**Solução**: 
1. Verificar DATABASE_URL
2. Verificar se PostgreSQL está rodando
3. Testar conexão manualmente

### Erro: "Prisma client not generated"
**Solução**: 
1. Adicionar `npx prisma generate` no build command
2. Verificar se schema.prisma está no repositório

### Erro: "Port already in use"
**Solução**: 
1. Verificar se PORT=4006 está configurado
2. Usar process.env.PORT no código

### Erro: "CORS blocked"
**Solução**: 
1. Configurar CORS_ORIGIN corretamente
2. Verificar se frontend URL está correto

### Performance Issues
**Solução**: 
1. Verificar logs de memória
2. Otimizar queries do banco
3. Implementar cache
4. Considerar upgrade do plano

## 📊 Monitoramento

### Logs em Tempo Real
```bash
# Via Dashboard
Render Dashboard > Service > Logs

# Via CLI
render logs -f your-service-id
```

### Métricas
- CPU Usage
- Memory Usage
- Response Time
- Error Rate
- Database Connections

### Alertas
Configurar alertas para:
- High CPU (>80%)
- High Memory (>90%)
- Error Rate (>5%)
- Response Time (>2s)

## 🔄 Atualizações

### Deploy Automático
Todo push para `main` triggera deploy automático

### Deploy Manual
```bash
render deploy --service your-service-id
```

### Rollback
```bash
# Via Dashboard: Deployments > Previous > Deploy
# Via CLI:
render rollback your-service-id --deployment deployment-id
```

## 🗄️ Backup e Restore

### Backup Automático
- Configurado para rodar diariamente às 2h
- Retenção de 7 dias
- Armazenado no Render

### Backup Manual
```bash
# Via Dashboard: Database > Backups > Create Backup
# Via CLI:
render db backup create your-database-id
```

### Restore
```bash
# Via Dashboard: Database > Backups > Restore
# Via CLI:
render db backup restore your-database-id backup-id
```

## 🔐 Segurança

### SSL/TLS
- ✅ HTTPS automático
- ✅ Certificados gerenciados pelo Render
- ✅ HTTP redirect para HTTPS

### Firewall
- ✅ Apenas portas necessárias expostas
- ✅ Database com acesso restrito
- ✅ Rate limiting configurado

### Secrets Management
- ✅ Environment variables criptografadas
- ✅ Secrets não logados
- ✅ Rotação de secrets recomendada

## 📈 Otimizações

### Performance
- ✅ Docker multi-stage build
- ✅ Node.js production mode
- ✅ Compression middleware
- ✅ Database connection pooling

### Scaling
- Auto-scaling baseado em CPU/Memory
- Horizontal scaling disponível
- Load balancing automático

## 🎉 Deploy Concluído!

Seu backend está agora rodando em produção no Render! 🚀

**URL do Backend**: `https://your-service-name.onrender.com`

**Próximos passos:**
1. Configurar banco de dados no Supabase (alternativa)
2. Conectar frontend com backend
3. Configurar CI/CD com GitHub Actions
4. Implementar monitoramento avançado