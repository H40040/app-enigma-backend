# Configuração de Variáveis de Ambiente - Railway

## 🚀 Variáveis Obrigatórias para o Railway

Para que o backend funcione corretamente no Railway, configure as seguintes variáveis de ambiente no dashboard:

### 📊 Configurações Básicas
```bash
NODE_ENV=production
PORT=4006
```

### 🔐 Segurança (OBRIGATÓRIO)
```bash
# Gere chaves seguras usando: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
JWT_SECRET=lI89jIXxfVHV2SQqwP0t24iTnu97+mq1328JKQlrlGc=
REFRESH_TOKEN_SECRET=lI89jIXxfVHV2SQqwP0t24iTnu97+mq1328JKQlrlGc=
COOKIE_SECRET=lI89jIXxfVHV2SQqwP0t24iTnu97+mq1328JKQlrlGc=
```

### ⏰ Configurações de Token
```bash
TOKEN_EXPIRATION=1h
REFRESH_TOKEN_EXPIRATION=7d
```

### 🌐 URLs
```bash
FRONTEND_URL=https://app-enigma-frontend.vercel.app
API_URL=https://enigma-crush-backend-develop.up.railway.app/api
```

### 🗄️ Banco de Dados
```bash
# O Railway fornece automaticamente a DATABASE_URL quando você adiciona PostgreSQL
# Não precisa configurar manualmente, mas deve estar no formato:
# DATABASE_URL=postgresql://username:password@host:port/database
```

### 📁 Configurações de Upload
```bash
UPLOAD_MAX_SIZE=5242880
UPLOAD_ALLOWED_TYPES=image/jpeg,image/png,image/gif,image/webp
```

### 🛡️ Rate Limiting
```bash
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
AUTH_RATE_LIMIT_MAX=5
PASSWORD_CHANGE_RATE_LIMIT_MAX=3
```

### 🕒 Configurações de Sessão
```bash
SESSION_TIMEOUT_MS=3600000
INACTIVE_SESSION_THRESHOLD_MS=3600000
```

### 📝 Configurações de Log
```bash
LOG_LEVEL=info
LOG_FILE_PATH=./logs/app.log
```

## 🔧 Como Configurar no Railway

### 1. Via Dashboard Web
1. Acesse [railway.app](https://railway.app)
2. Vá para seu projeto
3. Clique na aba **Variables**
4. Adicione cada variável uma por vez
5. Clique em **Deploy** para aplicar

### 2. Via Railway CLI
```bash
# Instalar CLI
npm install -g @railway/cli

# Login
railway login

# Conectar ao projeto
railway link

# Adicionar variáveis
railway variables set NODE_ENV=production
railway variables set PORT=4006
railway variables set JWT_SECRET=sua_chave_aqui
# ... continue para todas as variáveis

# Deploy
railway up
```

### 3. Via Arquivo .env (Desenvolvimento Local)
```bash
# Copie o .env.example
cp .env.example .env

# Edite o .env com suas configurações
# IMPORTANTE: Nunca commite o .env para o repositório!
```

## 🔍 Verificação

Após configurar as variáveis:

1. **Health Check**: `https://enigma-crush-backend-develop.up.railway.app/health`
2. **API Health**: `https://enigma-crush-backend-develop.up.railway.app/api/health`
3. **Logs**: Verifique os logs no Railway dashboard

## ⚠️ Problemas Comuns

### Erro: "tabela users não existe"
- **Causa**: Migrações não foram executadas
- **Solução**: O `entrypoint.sh` foi atualizado para executar migrações automaticamente

### Erro: "JWT_SECRET is required"
- **Causa**: Variável JWT_SECRET não configurada
- **Solução**: Configure todas as variáveis de segurança obrigatórias

### Erro de CORS
- **Causa**: FRONTEND_URL incorreta
- **Solução**: Configure FRONTEND_URL com a URL exata do Vercel

## 🔐 Gerando Chaves Seguras

```bash
# Para JWT_SECRET
node -e "console.log('JWT_SECRET=' + require('crypto').randomBytes(32).toString('base64'))"

# Para REFRESH_TOKEN_SECRET
node -e "console.log('REFRESH_TOKEN_SECRET=' + require('crypto').randomBytes(32).toString('base64'))"

# Para COOKIE_SECRET
node -e "console.log('COOKIE_SECRET=' + require('crypto').randomBytes(32).toString('base64'))"
```

## 📚 Recursos Adicionais

- [Railway Documentation](https://docs.railway.app)
- [Railway Environment Variables](https://docs.railway.app/develop/variables)
- [Railway PostgreSQL](https://docs.railway.app/databases/postgresql)