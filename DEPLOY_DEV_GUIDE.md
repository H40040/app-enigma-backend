# ��� Guia de Deploy para Ambiente de Desenvolvimento

## Visão Geral

Este guia descreve como fazer deploy do Enigma Crush para o ambiente de desenvolvimento.

### Arquitetura de Deploy Dev

- **Backend**: Render.com (app-enigma-backend)
- **Frontend**: Vercel (app-enigma-frontend)
- **Database**: PostgreSQL no Render
- **Branch**: `develop`

## ��� Pré-requisitos

### 1. Contas e Acessos
- [ ] Conta no Render.com
- [ ] Conta no Vercel
- [ ] Acesso ao repositório GitHub
- [ ] Permissões de deploy

### 2. Checklist de Database (Render)
- [ ] Database PostgreSQL criado no Render
- [ ] Database com status "Available"
- [ ] Internal Database URL copiada
- [ ] DATABASE_URL configurada no serviço web
- [ ] Migrations executadas com sucesso
- [ ] Conexão testada via `/health` endpoint

### 3. Configurações Locais
```bash
# Instalar dependências
npm install

# Configurar ambiente de desenvolvimento
cp .env.development .env
```

### 4. Variáveis de Ambiente

#### Backend (.env.development)
```env
NODE_ENV=development
PORT=4007
DEBUG=true
LOG_LEVEL=debug
DATABASE_URL=postgresql://user:password@localhost:5432/enigma_crush_dev
JWT_SECRET=dev_jwt_secret_key_change_in_production
JWT_EXPIRES_IN=7d
BCRYPT_ROUNDS=10
CORS_ORIGIN=https://enigma-crush-frontend-dev.vercel.app,http://localhost:3000
RATE_LIMIT_WINDOW_MS=300000
RATE_LIMIT_MAX_REQUESTS=200
APIGRATIS_TOKEN=your_dev_token_here
APIGRATIS_WHATSAPP_TOKEN=your_dev_whatsapp_token_here
```

#### Frontend (.env.development)
```env
VITE_API_BASE=https://enigma-crush-backend-dev.onrender.com/
VITE_ENVIRONMENT=development
VITE_APP_NAME=Enigma Crush Dev
VITE_DEBUG=true
```

## ��� Configuração do Render (Backend)

### 1. Criar Serviço no Render

1. Acesse [Render Dashboard](https://dashboard.render.com)
2. Clique em "New" → "Web Service"
3. Conecte o repositório GitHub
4. Configure:
   - **Name**: `enigma-crush-backend-dev`
   - **Branch**: `develop`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Plan**: Free

### 2. Configurar Variáveis de Ambiente

No painel do Render, adicione as seguintes variáveis:

```
NODE_ENV=development
PORT=4007
DEBUG=true
LOG_LEVEL=debug
JWT_SECRET=[GERAR_AUTOMATICAMENTE]
JWT_EXPIRES_IN=7d
BCRYPT_ROUNDS=10
CORS_ORIGIN=https://enigma-crush-frontend-dev.vercel.app
RATE_LIMIT_WINDOW_MS=300000
RATE_LIMIT_MAX_REQUESTS=200
APIGRATIS_TOKEN=[SEU_TOKEN_DEV]
APIGRATIS_WHATSAPP_TOKEN=[SEU_TOKEN_WHATSAPP_DEV]
```

### 3. Configurar Database PostgreSQL

#### 3.1. Criar Database no Render

1. **Acesse o Dashboard do Render**:
   - Vá para [dashboard.render.com](https://dashboard.render.com)
   - Clique em "New" → "PostgreSQL"

2. **Configurar Database**:
   - **Name**: `enigma-crush-db-dev`
   - **Database Name**: `enigma_crush_dev`
   - **User**: `enigma_user_dev`
   - **Region**: Escolha a mesma região do seu serviço web
   - **PostgreSQL Version**: 15 (recomendado)
   - **Plan**: Free (para desenvolvimento)

3. **Aguardar Criação**:
   - O processo leva alguns minutos
   - Aguarde até o status ficar "Available"

#### 3.2. Obter Credenciais do Database

1. **No Dashboard do Database**:
   - Clique no database criado
   - Vá para a aba "Info"
   - Copie as seguintes informações:
     - **Internal Database URL** postgresql://enigma_user_dev:sQYmMeVF2ksSkElDYgclEEOUU7vRCrt8@dpg-d2q84mp5pdvs73dn8cog-a/enigma_crush_dev
     - **External Database URL** postgresql://enigma_user_dev:sQYmMeVF2ksSkElDYgclEEOUU7vRCrt8@dpg-d2q84mp5pdvs73dn8cog-a.virginia-postgres.render.com/enigma_crush_dev
     - **Hostname** dpg-d2q84mp5pdvs73dn8cog-a
     - **Port** 5432
     - **Database** enigma_crush_dev
     - **Username** enigma_user_dev
     - **Password** sQYmMeVF2ksSkElDYgclEEOUU7vRCrt8

#### 3.3. Conectar Database ao Serviço Web

1. **No Serviço Web do Backend**:
   - Vá para o serviço `app-enigma-backend`
   - Clique em "Environment"
   - Adicione a variável `DATABASE_URL`:
     ```
     DATABASE_URL=postgresql://username:password@hostname:port/database
     ```
   - Use a **Internal Database URL** para melhor performance

2. **Exemplo de DATABASE_URL**:
   ```
   DATABASE_URL=postgresql://enigma_user_dev:senha123@dpg-abc123-a.oregon-postgres.render.com:5432/enigma_crush_dev
   ```

#### 3.4. Executar Migrações

1. **Configurar Script de Deploy**:
   - No `package.json`, certifique-se de ter:
   ```json
   {
     "scripts": {
       "build": "npm run db:migrate && echo 'Build completed'",
       "db:migrate": "npx prisma migrate deploy",
       "db:generate": "npx prisma generate"
     }
   }
   ```

2. **Deploy Automático**:
   - As migrações serão executadas automaticamente no deploy
   - O Render executará `npm run build` que inclui as migrações

#### 3.5. Verificar Conexão

1. **Teste Local** (opcional):
   ```bash
   # Adicione a DATABASE_URL no .env.development
   DATABASE_URL="postgresql://username:password@hostname:port/database"
   
   # Teste a conexão
   npx prisma db pull
   ```

2. **Verificar no Render**:
   - Após o deploy, verifique os logs do serviço
   - Procure por mensagens de conexão com o database
   - Teste o endpoint `/health` que deve incluir status do DB

## ��� Configuração do Vercel (Frontend)

### 1. Conectar Repositório

1. Acesse [Vercel Dashboard](https://vercel.com/dashboard)
2. Clique em "New Project"
3. Importe o repositório do frontend
4. Configure:
   - **Project Name**: `app-enigma-frontend`
   - **Framework**: Vite
   - **Root Directory**: `./` (ou caminho do frontend)
   - **Build Command**: `bun run build`
   - **Output Directory**: `dist`

### 2. Configurar Variáveis de Ambiente

No painel do Vercel, adicione:

```
VITE_API_BASE=https://app-enigma-backend.onrender.com/
VITE_ENVIRONMENT=development
VITE_APP_NAME=Enigma Crush Dev
VITE_DEBUG=true
```

### 3. Configurar Deploy

- **Production Branch**: `develop`
- **Auto-deploy**: Habilitado
- **Install Command**: `bun install`
- **Build Command**: `bun run build`
- **Output Directory**: `dist`

## ��� Processo de Deploy

### Método 1: Deploy Automático (Recomendado)

1. **Fazer push para branch develop**:
```bash
git checkout develop
git add .
git commit -m "feat: nova funcionalidade para dev"
git push origin develop
```

2. **GitHub Actions** executará automaticamente:
   - Testes do backend
   - Deploy no Render
   - Validação pós-deploy

3. **Vercel** fará deploy automático do frontend

### Método 2: Deploy Manual com Script

```bash
# Executar script de deploy
./scripts/deploy-dev.sh
```

O script irá:
- ✅ Executar testes
- ��� Fazer build
- ��� Commit e push (se necessário)
- ��� Disparar deploy no Render
- ✅ Validar deploy

### Método 3: Deploy Manual

#### Backend (Render)
1. Acesse o dashboard do Render
2. Selecione o serviço `enigma-crush-backend-dev`
3. Clique em "Manual Deploy" → "Deploy latest commit"

#### Frontend (Vercel)
1. Acesse o dashboard do Vercel
2. Selecione o projeto `enigma-crush-frontend-dev`
3. Clique em "Redeploy"

## ��� Validação do Deploy

### 1. Health Check Automático
```bash
# Verificar saúde do backend
node scripts/health-check.js
```

### 2. Testes de Produção
```bash
# Executar validação completa
node scripts/validate-production.js
```

### 3. Verificação Manual

#### Backend
- **URL**: https://enigma-crush-backend-dev.onrender.com
- **Health**: https://enigma-crush-backend-dev.onrender.com/health
- **API Docs**: https://enigma-crush-backend-dev.onrender.com/api-docs

#### Frontend
- **URL**: https://enigma-crush-frontend-dev.vercel.app
- **Login**: Testar funcionalidade de login
- **Registro**: Testar criação de conta

## ��� Monitoramento e Logs

### Backend (Render)
- **Logs**: Dashboard Render → Service → Logs
- **Metrics**: Dashboard Render → Service → Metrics
- **Events**: Dashboard Render → Service → Events

### Frontend (Vercel)
- **Functions**: Dashboard Vercel → Project → Functions
- **Analytics**: Dashboard Vercel → Project → Analytics
- **Deployments**: Dashboard Vercel → Project → Deployments

## ��� Troubleshooting

### Problemas Comuns

#### 1. Deploy Falha no Render
```bash
# Verificar logs
curl https://enigma-crush-backend-dev.onrender.com/health

# Verificar variáveis de ambiente
# No dashboard do Render → Environment
```

#### 2. Frontend não Conecta ao Backend
```bash
# Verificar CORS
# Verificar NEXT_PUBLIC_API_BASE
# Verificar se backend está rodando
```

#### 3. Database Connection Error
```bash
# Verificar DATABASE_URL
echo $DATABASE_URL

# Testar conexão direta
psql $DATABASE_URL -c "SELECT version();"

# Verificar se database está ativo no Render
curl -I https://enigma-crush-backend-dev.onrender.com/health

# Verificar status das migrations
npx prisma migrate status

# Forçar nova migration (se necessário)
npx prisma migrate deploy

# Reset completo do database (CUIDADO - apaga todos os dados)
npx prisma migrate reset --force
```

#### 4. Problemas Específicos do Database

**Erro: "relation does not exist"**
```bash
# Executar migrations
npx prisma migrate deploy

# Gerar cliente Prisma
npx prisma generate

# Verificar schema
npx prisma db pull
```

**Erro: "Connection timeout"**
```bash
# Verificar se o database está ativo no Render
# Verificar se a região do database é a mesma do serviço
# Usar Internal Database URL em vez da External
```

**Erro: "Too many connections"**
```bash
# No Render Free tier, limite de 20 conexões
# Verificar connection pooling no Prisma
# Adicionar no schema.prisma:
# datasource db {
#   provider = "postgresql"
#   url      = env("DATABASE_URL")
#   directUrl = env("DIRECT_URL") // Para migrations
# }
```

### Comandos Úteis

```bash
# Verificar status dos serviços
curl -I https://enigma-crush-backend-dev.onrender.com/health
curl -I https://enigma-crush-frontend-dev.vercel.app

# Verificar database específico
curl https://enigma-crush-backend-dev.onrender.com/health | jq '.database'

# Comandos de database
npx prisma migrate status          # Status das migrations
npx prisma migrate deploy          # Executar migrations
npx prisma generate                # Gerar cliente Prisma
npx prisma db pull                 # Sincronizar schema
npx prisma studio                  # Interface visual do DB (local)

# Logs locais
npm run dev  # Backend local
npm run dev  # Frontend local

# Testes
npm test
npm run test:coverage

# Debug de conexão com database
node -e "const { PrismaClient } = require('@prisma/client'); const prisma = new PrismaClient(); prisma.\$connect().then(() => console.log('DB Connected')).catch(console.error);"
```

## ��� Suporte

- **Documentação**: Este arquivo
- **Issues**: GitHub Issues
- **Logs**: Render/Vercel Dashboards

---

## ��� URLs de Desenvolvimento

- **Backend Dev**: https://enigma-crush-backend-dev.onrender.com
- **Frontend Dev**: https://enigma-crush-frontend-dev.vercel.app
- **Database**: PostgreSQL no Render
- **Monitoramento**: Dashboards Render/Vercel

---

*Última atualização: $(date '+%Y-%m-%d')*
