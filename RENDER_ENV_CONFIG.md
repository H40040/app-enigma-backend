# Configuração de Variáveis de Ambiente no Render

## 🚨 Problema Identificado
O deploy está falhando porque as variáveis de ambiente `REFRESH_TOKEN_SECRET` e `COOKIE_SECRET` não estão configuradas no Render.

## 📋 Variáveis Necessárias
As seguintes variáveis precisam ser adicionadas no painel do Render:

### Variáveis de Segurança (OBRIGATÓRIAS)
```
REFRESH_TOKEN_SECRET=dev_refresh_token_secret_key_for_development_only_32_chars_minimum
COOKIE_SECRET=dev_cookie_secret_key_for_development_only_32_chars_minimum
```

### Variáveis Completas para Ambiente de Desenvolvimento
```
# Configurações do servidor
PORT=4006
NODE_ENV=development

# Segurança
JWT_SECRET=dev_jwt_secret_key_for_development_only_32_chars_minimum
REFRESH_TOKEN_SECRET=dev_refresh_token_secret_key_for_development_only_32_chars_minimum
TOKEN_EXPIRATION=1h
REFRESH_TOKEN_EXPIRATION=7d
COOKIE_SECRET=dev_cookie_secret_key_for_development_only_32_chars_minimum

# URLs
FRONTEND_URL=https://enigma-crush-frontend-dev.vercel.app
API_URL=https://enigma-crush-backend-dev.onrender.com/api
SERVER_IP=0.0.0.0

# Banco de dados
DATABASE_URL=postgresql://enigma_crush_dev_user:enigma_crush_dev_password@dpg-cs8ej8pu0jms73e8qlr0-a.oregon-postgres.render.com/enigma_crush_dev

# APIs externas
API_GRATIS_TOKEN=dev_api_token
API_GRATIS_BASE_URL=https://api.gratis.com

# Upload
UPLOAD_MAX_SIZE=5242880
UPLOAD_ALLOWED_TYPES=image/jpeg,image/png,image/gif,image/webp

# Rate limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
AUTH_RATE_LIMIT_MAX=5
PASSWORD_CHANGE_RATE_LIMIT_MAX=3

# Sessão
SESSION_TIMEOUT_MS=3600000
INACTIVE_SESSION_THRESHOLD_MS=3600000

# Log
LOG_LEVEL=info
LOG_FILE_PATH=./logs/app.log
```

## 🔧 Como Configurar no Render

### Passo 1: Acessar o Dashboard
1. Acesse: https://dashboard.render.com
2. Faça login na sua conta
3. Localize o serviço `enigma-crush-backend-dev`

### Passo 2: Configurar Variáveis de Ambiente
1. Clique no serviço `enigma-crush-backend-dev`
2. Vá para a aba **"Environment"**
3. Clique em **"Add Environment Variable"**
4. Adicione cada variável uma por vez:
   - **Key**: Nome da variável (ex: `REFRESH_TOKEN_SECRET`)
   - **Value**: Valor da variável (ex: `dev_refresh_token_secret_key_for_development_only_32_chars_minimum`)

### Passo 3: Fazer Deploy
1. Após adicionar todas as variáveis, clique em **"Save Changes"**
2. O Render irá automaticamente fazer um novo deploy
3. Aguarde o deploy ser concluído

### Passo 4: Validar Deploy
1. Acesse a URL do serviço: https://enigma-crush-backend-dev.onrender.com/api/health
2. Verifique se o status é `HEALTHY`
3. Confirme que não há mais erros de variáveis de ambiente

## 🚨 Variáveis Críticas
As variáveis mais importantes que **DEVEM** ser configuradas:
- `REFRESH_TOKEN_SECRET` - Para tokens de refresh
- `COOKIE_SECRET` - Para segurança de cookies
- `DATABASE_URL` - Para conexão com o banco
- `JWT_SECRET` - Para autenticação JWT

## ✅ Verificação de Sucesso
Após configurar as variáveis, o health check deve retornar:
```json
{
  "status": "HEALTHY",
  "checks": {
    "database": "healthy",
    "api": "healthy",
    "memory": "healthy",
    "cpu": "healthy",
    "disk": "healthy",
    "environment": "healthy"
  }
}
```

## 🔄 Próximos Passos
1. Configure as variáveis no Render seguindo este guia
2. Aguarde o deploy automático
3. Execute novamente o script de deploy para validar: `./scripts/deploy-dev.sh`
4. Teste a integração frontend-backend

---

**Nota**: Este é um ambiente de desenvolvimento. Para produção, use chaves mais seguras e complexas.