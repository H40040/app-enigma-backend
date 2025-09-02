# Deploy no Railway.app - Enigma Crush Backend

## 🚀 Configuração do Deploy

Este projeto está configurado para deploy automático no Railway.app com PostgreSQL integrado.

### 📋 Pré-requisitos

1. Conta no Railway.app
2. Repositório GitHub conectado
3. PostgreSQL database provisionado no Railway

### 🔧 Configuração Inicial

#### 1. Criar Projeto no Railway

```bash
# Via CLI (opcional)
npm install -g @railway/cli
railway login
railway init
```

#### 2. Adicionar PostgreSQL Database

No dashboard do Railway:
1. Clique em "+ New"
2. Selecione "Database"
3. Escolha "Add PostgreSQL"

#### 3. Configurar Variáveis de Ambiente

No Railway dashboard, adicione as seguintes variáveis:

```env
# Essenciais
NODE_ENV=production
DATABASE_URL=${{Postgres.DATABASE_URL}}
FRONTEND_URL=https://enigma-crush-frontend.vercel.app

# Opcionais (se necessário)
JWT_SECRET=seu_jwt_secret_aqui
ENCRYPTION_KEY=sua_chave_de_criptografia_aqui
```

### 🏗️ Processo de Build

O Railway executará automaticamente:

1. `npm ci` - Instalar dependências
2. `npx prisma generate` - Gerar cliente Prisma
3. `npx prisma migrate deploy` - Aplicar migrações
4. `npm start` - Iniciar aplicação

### 📁 Arquivos de Configuração

- `railway.json` - Configuração específica do Railway
- `.railwayignore` - Arquivos ignorados no deploy
- `index.js` - Configurado para bind em `0.0.0.0`

### 🔍 Verificação do Deploy

#### Health Check
```bash
curl https://seu-app.railway.app/health
```

#### Endpoints de Teste
```bash
# Verificar API
curl https://seu-app.railway.app/api/health

# Testar CORS
curl -H "Origin: https://enigma-crush-frontend.vercel.app" \
     https://seu-app.railway.app/api/health
```

### 🐛 Troubleshooting

#### Problemas Comuns

1. **Erro de Conexão com Database**
   - Verificar se `DATABASE_URL` está configurada
   - Confirmar que PostgreSQL está rodando

2. **Migrações Falhando**
   ```bash
   # Via Railway CLI
   railway run npx prisma migrate reset --force
   railway run npx prisma migrate deploy
   ```

3. **CORS Issues**
   - Verificar `FRONTEND_URL` nas variáveis de ambiente
   - Confirmar configuração no `index.js`

#### Logs
```bash
# Via CLI
railway logs

# Via Dashboard
# Acesse: https://railway.app/dashboard
```

### 🔄 Deploy Automático

O deploy é automático via GitHub:
1. Push para branch `main` ou `develop`
2. Railway detecta mudanças
3. Executa build e deploy
4. Aplicação fica disponível

### 📊 Monitoramento

- **Metrics**: Dashboard do Railway
- **Logs**: Railway CLI ou Dashboard
- **Health**: Endpoint `/health`
- **Database**: Railway PostgreSQL dashboard

### 🔐 Segurança

- SSL/TLS automático
- Variáveis de ambiente seguras
- PostgreSQL com SSL habilitado
- Rate limiting configurado

### 💰 Custos

- **Starter Plan**: Gratuito
  - 512MB RAM
  - 1GB Storage
  - PostgreSQL incluído
  - $5/mês após limite gratuito

### 🚀 Próximos Passos

1. Configurar domínio customizado (opcional)
2. Configurar backups automáticos
3. Implementar monitoring avançado
4. Configurar staging environment

---

## 📞 Suporte

- **Railway Docs**: https://docs.railway.app
- **Railway Discord**: https://discord.gg/railway
- **GitHub Issues**: Para problemas específicos do projeto