# 🧪 Guia de Testes de Produção - Enigma Crush

## 📋 Visão Geral

Este guia fornece instruções detalhadas para testar o funcionamento completo da aplicação Enigma Crush em ambiente de produção.

## 🎯 Objetivos dos Testes

- ✅ Validar deploy do frontend (Vercel)
- ✅ Validar deploy do backend (Render)
- ✅ Validar conexão com banco de dados (Supabase)
- ✅ Testar funcionalidades principais
- ✅ Verificar performance e segurança
- ✅ Validar CI/CD pipeline

---

## 🚀 Pré-requisitos

### Ferramentas Necessárias
```bash
# Instalar ferramentas de teste
npm install -g artillery
npm install -g lighthouse
npm install -g @vercel/cli
npm install -g render-cli
```

### Variáveis de Ambiente
```bash
# URLs de produção
export FRONTEND_URL="https://your-app.vercel.app"
export BACKEND_URL="https://your-backend.onrender.com"
export DATABASE_URL="postgresql://..."
```

---

## 🔍 Testes de Infraestrutura

### 1. Teste de Health Check

#### Backend Health Check
```bash
# Teste básico de saúde
curl -f $BACKEND_URL/health

# Teste detalhado
curl -s $BACKEND_URL/health | jq .

# Esperado:
{
  "status": "ok",
  "timestamp": "2024-01-XX...",
  "uptime": "...",
  "database": "connected",
  "memory": {...},
  "version": "1.0.0"
}
```

#### Frontend Health Check
```bash
# Verificar se o frontend está acessível
curl -I $FRONTEND_URL

# Esperado: HTTP/2 200
```

### 2. Teste de Conectividade do Banco

```bash
# Via API do backend
curl -s $BACKEND_URL/api/health/database

# Esperado:
{
  "database": {
    "status": "connected",
    "latency": "< 100ms",
    "pool": {
      "active": 2,
      "idle": 8,
      "total": 10
    }
  }
}
```

---

## 🧪 Testes Funcionais

### 3. Teste de Autenticação

#### Registro de Usuário
```bash
# Criar novo usuário
curl -X POST $BACKEND_URL/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPassword123!",
    "name": "Test User"
  }'

# Esperado:
{
  "success": true,
  "user": {
    "id": "...",
    "email": "test@example.com",
    "name": "Test User"
  },
  "token": "eyJ..."
}
```

#### Login de Usuário
```bash
# Login
curl -X POST $BACKEND_URL/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPassword123!"
  }'

# Salvar token para próximos testes
export AUTH_TOKEN="eyJ..."
```

### 4. Teste de Endpoints Protegidos

```bash
# Testar endpoint protegido
curl -H "Authorization: Bearer $AUTH_TOKEN" \
  $BACKEND_URL/api/user/profile

# Esperado:
{
  "id": "...",
  "email": "test@example.com",
  "name": "Test User",
  "createdAt": "..."
}
```

### 5. Teste de CORS

```bash
# Testar CORS preflight
curl -X OPTIONS $BACKEND_URL/api/auth/login \
  -H "Origin: $FRONTEND_URL" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type"

# Verificar headers de resposta
```

---

## ⚡ Testes de Performance

### 6. Teste de Carga com Artillery

```bash
# Executar teste de carga
cd enigma-crush-backend
npm run performance:prod

# Ou manualmente:
artillery run artillery.yml --environment production
```

#### Métricas Esperadas
- **Response Time (p95)**: < 500ms
- **Response Time (p99)**: < 1000ms
- **Error Rate**: < 1%
- **Requests per Second**: > 100

### 7. Teste de Performance Frontend (Lighthouse)

```bash
# Executar Lighthouse
lighthouse $FRONTEND_URL --output json --output html

# Ou via npm (se configurado)
npm run lighthouse:prod
```

#### Scores Esperados
- **Performance**: > 80
- **Accessibility**: > 90
- **Best Practices**: > 85
- **SEO**: > 80

---

## 🔒 Testes de Segurança

### 8. Teste de Rate Limiting

```bash
# Script para testar rate limiting
for i in {1..110}; do
  curl -s -o /dev/null -w "%{http_code}\n" $BACKEND_URL/api/auth/login
done

# Esperado: Primeiros 100 requests = 200/400, depois 429
```

### 9. Teste de Headers de Segurança

```bash
# Verificar headers de segurança
curl -I $BACKEND_URL/api/health

# Verificar presença de:
# - X-Content-Type-Options: nosniff
# - X-Frame-Options: DENY
# - X-XSS-Protection: 1; mode=block
# - Strict-Transport-Security: max-age=...
```

### 10. Teste de Validação de Input

```bash
# Testar SQL injection
curl -X POST $BACKEND_URL/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com'; DROP TABLE users; --",
    "password": "password"
  }'

# Esperado: Erro de validação, não erro de SQL
```

---

## 🌐 Testes de Integração Frontend-Backend

### 11. Teste de Fluxo Completo

#### Via Browser (Manual)
1. Acessar `$FRONTEND_URL`
2. Registrar novo usuário
3. Fazer login
4. Navegar pelas páginas principais
5. Testar funcionalidades principais
6. Fazer logout

#### Via Playwright (Automatizado)
```bash
# Se configurado no frontend
npm run test:e2e:prod
```

### 12. Teste de WebSocket (se aplicável)

```bash
# Testar conexão WebSocket
wscat -c ws://${BACKEND_URL}/ws
```

---

## 📊 Monitoramento e Logs

### 13. Verificar Logs de Produção

#### Logs do Render
```bash
# Via CLI do Render
render logs --service-id $RENDER_SERVICE_ID --tail

# Via dashboard: https://dashboard.render.com
```

#### Logs do Vercel
```bash
# Via CLI do Vercel
vercel logs $FRONTEND_URL

# Via dashboard: https://vercel.com/dashboard
```

#### Logs do Supabase
```bash
# Via dashboard: https://supabase.com/dashboard
# Verificar:
# - Database logs
# - API logs
# - Auth logs
```

### 14. Métricas de Sistema

#### Backend (Render)
- CPU Usage: < 80%
- Memory Usage: < 80%
- Disk Usage: < 70%
- Network I/O: Estável

#### Database (Supabase)
- Connection Pool: < 80% utilização
- Query Performance: < 100ms média
- Storage: < 80% utilização

---

## 🚨 Testes de Recuperação

### 15. Teste de Failover

```bash
# Simular alta carga
artillery run artillery.yml --environment stress

# Monitorar:
# - Auto-scaling do Render
# - Connection pooling do Supabase
# - CDN do Vercel
```

### 16. Teste de Backup e Restore

```bash
# Verificar backups automáticos do Supabase
# Via dashboard: https://supabase.com/dashboard/project/[id]/database/backups

# Testar restore (em ambiente de staging)
```

---

## ✅ Checklist de Validação

### Infraestrutura
- [ ] Frontend acessível via HTTPS
- [ ] Backend respondendo health checks
- [ ] Database conectado e responsivo
- [ ] CDN funcionando (assets estáticos)
- [ ] SSL/TLS configurado corretamente

### Funcionalidades
- [ ] Registro de usuário
- [ ] Login/logout
- [ ] Autenticação JWT
- [ ] Endpoints protegidos
- [ ] Validação de dados
- [ ] Upload de arquivos (se aplicável)

### Performance
- [ ] Lighthouse score > 80
- [ ] API response time < 500ms (p95)
- [ ] Database queries < 100ms
- [ ] Frontend load time < 3s

### Segurança
- [ ] HTTPS enforced
- [ ] CORS configurado
- [ ] Rate limiting ativo
- [ ] Headers de segurança
- [ ] Input validation
- [ ] SQL injection protection

### Monitoramento
- [ ] Logs sendo gerados
- [ ] Métricas sendo coletadas
- [ ] Alertas configurados
- [ ] Backups funcionando

---

## 🔧 Scripts de Automação

### Script de Teste Completo

```bash
#!/bin/bash
# test-production.sh

set -e

echo "🧪 Iniciando testes de produção..."

# Configurar variáveis
FRONTEND_URL="https://your-app.vercel.app"
BACKEND_URL="https://your-backend.onrender.com"

# 1. Health checks
echo "📊 Testando health checks..."
curl -f $BACKEND_URL/health || exit 1
curl -I $FRONTEND_URL | grep "200 OK" || exit 1

# 2. Teste de autenticação
echo "🔐 Testando autenticação..."
TOKEN=$(curl -s -X POST $BACKEND_URL/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"TestPassword123!"}' \
  | jq -r '.token')

if [ "$TOKEN" = "null" ]; then
  echo "❌ Falha na autenticação"
  exit 1
fi

# 3. Teste de endpoint protegido
echo "🛡️ Testando endpoint protegido..."
curl -f -H "Authorization: Bearer $TOKEN" $BACKEND_URL/api/user/profile || exit 1

# 4. Teste de performance
echo "⚡ Testando performance..."
artillery run artillery.yml --environment production

echo "✅ Todos os testes passaram!"
```

### Executar Testes

```bash
# Dar permissão de execução
chmod +x test-production.sh

# Executar
./test-production.sh
```

---

## 🚨 Troubleshooting

### Problemas Comuns

#### Frontend não carrega
```bash
# Verificar build do Vercel
vercel logs $FRONTEND_URL

# Verificar DNS
nslookup your-app.vercel.app
```

#### Backend não responde
```bash
# Verificar logs do Render
render logs --service-id $RENDER_SERVICE_ID

# Verificar variáveis de ambiente
render env list --service-id $RENDER_SERVICE_ID
```

#### Database connection error
```bash
# Testar conexão direta
psql $DATABASE_URL -c "SELECT 1;"

# Verificar pool de conexões no Supabase
```

#### Performance baixa
```bash
# Analisar com Artillery
artillery run artillery.yml --environment production

# Verificar métricas no Render
# Verificar query performance no Supabase
```

---

## 📈 Próximos Passos

1. **Monitoramento Contínuo**
   - Configurar alertas
   - Implementar APM (Application Performance Monitoring)
   - Configurar uptime monitoring

2. **Otimizações**
   - Implementar cache (Redis)
   - Otimizar queries do banco
   - Implementar CDN para assets

3. **Segurança Avançada**
   - Implementar WAF (Web Application Firewall)
   - Configurar DDoS protection
   - Implementar 2FA

4. **Escalabilidade**
   - Configurar auto-scaling
   - Implementar load balancing
   - Otimizar para múltiplas regiões

---

## 📚 Recursos Adicionais

- [Render Documentation](https://render.com/docs)
- [Vercel Documentation](https://vercel.com/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Artillery Documentation](https://artillery.io/docs)
- [Lighthouse Documentation](https://developers.google.com/web/tools/lighthouse)

---

**✨ Lembre-se: Testes de produção devem ser executados regularmente para garantir a qualidade e confiabilidade da aplicação!**