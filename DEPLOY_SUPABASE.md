# 🗄️ Deploy Database no Supabase - Enigma Crush

## 📋 Pré-requisitos

- [ ] Conta no Supabase (https://supabase.com)
- [ ] Supabase CLI instalado
- [ ] Schema PostgreSQL configurado
- [ ] Dados de migração preparados

## 🚀 Configuração Rápida

### 1. Instalar Supabase CLI

```bash
# Windows (via npm)
npm install -g supabase

# Ou via Chocolatey
choco install supabase

# Ou via Scoop
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
```

### 2. Login no Supabase

```bash
# Login via browser
supabase login

# Ou via access token
supabase auth login --token YOUR_ACCESS_TOKEN
```

### 3. Criar Projeto no Supabase

#### Via Dashboard
1. Acesse [Supabase Dashboard](https://app.supabase.com)
2. Clique em "New Project"
3. Configure:
   ```
   Name: enigma-crush
   Database Password: [SENHA_FORTE]
   Region: East US (us-east-1)
   Plan: Free
   ```

#### Via CLI
```bash
# Criar projeto
supabase projects create enigma-crush --region us-east-1

# Listar projetos
supabase projects list
```

### 4. Inicializar Projeto Local

```bash
# No diretório do backend
cd enigma-crush-backend

# Inicializar Supabase
supabase init

# Linkar com projeto remoto
supabase link --project-ref YOUR_PROJECT_REF
```

### 5. Configurar Database

```bash
# Aplicar migrações
supabase db push

# Ou aplicar migração específica
supabase migration up

# Verificar status
supabase db status
```

## 🔧 Configuração Detalhada

### Variáveis de Ambiente

Configure no seu `.env`:

```bash
# Supabase Configuration
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Database URL para Prisma
DATABASE_URL="postgresql://postgres:[PASSWORD]@db.your-project-ref.supabase.co:5432/postgres?schema=public&pgbouncer=true"

# Direct connection (para migrações)
DIRECT_URL="postgresql://postgres:[PASSWORD]@db.your-project-ref.supabase.co:5432/postgres?schema=public"
```

### Obter Credenciais

```bash
# Via CLI
supabase status

# Ou no Dashboard: Settings > API
```

### Schema e Migrações

#### Aplicar Schema Inicial
```bash
# Aplicar migração inicial
supabase db push --include-all

# Ou executar SQL diretamente
supabase db reset
```

#### Criar Nova Migração
```bash
# Criar migração
supabase migration new add_new_feature

# Aplicar migração
supabase db push
```

#### Sincronizar com Prisma
```bash
# Gerar cliente Prisma
npx prisma generate

# Aplicar migrações Prisma
npx prisma db push

# Ou usar migrate deploy para produção
npx prisma migrate deploy
```

## 🔐 Configuração de Segurança

### Row Level Security (RLS)

```sql
-- Habilitar RLS em todas as tabelas
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "messages" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "admirers" ENABLE ROW LEVEL SECURITY;

-- Criar políticas de segurança
CREATE POLICY "Users can only see own data" ON "users"
  FOR ALL USING (auth.uid() = id);
```

### Configurar Auth

```bash
# Configurar providers de auth
supabase auth update --enable-signup=true
supabase auth update --enable-email-confirmations=false
```

### API Keys e Permissões

- **Anon Key**: Para frontend (público)
- **Service Role Key**: Para backend (privado)
- **JWT Secret**: Para validação de tokens

## 📊 Migração de Dados

### Backup dos Dados Atuais

```bash
# Backup SQLite para JSON
node scripts/backup-sqlite.js

# Ou usar script de migração
node scripts/migrate-to-postgresql.js
```

### Importar Dados

```bash
# Via Supabase CLI
supabase db dump --data-only > backup.sql
supabase db reset
psql -h db.your-project-ref.supabase.co -U postgres -d postgres < backup.sql

# Ou via script personalizado
node scripts/import-to-supabase.js
```

### Validar Migração

```sql
-- Verificar contagem de registros
SELECT 
  'users' as table_name, COUNT(*) as count FROM "users"
UNION ALL
SELECT 'messages', COUNT(*) FROM "messages"
UNION ALL
SELECT 'admirers', COUNT(*) FROM "admirers";

-- Verificar integridade referencial
SELECT 
  u.name, 
  COUNT(a.id) as admirers_count,
  COUNT(m.id) as messages_count
FROM "users" u
LEFT JOIN "admirers" a ON u.id = a."userId"
LEFT JOIN "messages" m ON u.id = m."senderId"
GROUP BY u.id, u.name;
```

## 🔧 Scripts de Configuração

### Script de Setup Automático

```bash
#!/bin/bash
# setup-supabase.sh

echo "🚀 Configurando Supabase para Enigma Crush..."

# Verificar se CLI está instalado
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI não encontrado. Instalando..."
    npm install -g supabase
fi

# Login (se necessário)
echo "🔐 Fazendo login no Supabase..."
supabase login

# Inicializar projeto
echo "📦 Inicializando projeto..."
supabase init

# Aplicar migrações
echo "🗄️ Aplicando migrações..."
supabase db push

# Gerar tipos TypeScript
echo "📝 Gerando tipos TypeScript..."
supabase gen types typescript --local > types/supabase.ts

echo "✅ Configuração concluída!"
```

### Script de Migração de Dados

```javascript
// scripts/migrate-to-supabase.js
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function migrateData() {
  console.log('🚀 Iniciando migração para Supabase...');
  
  // Ler backup SQLite
  const backup = JSON.parse(fs.readFileSync('backup/sqlite-data.json', 'utf8'));
  
  // Migrar usuários
  console.log('👥 Migrando usuários...');
  const { data: users, error: usersError } = await supabase
    .from('users')
    .insert(backup.users);
    
  if (usersError) {
    console.error('❌ Erro ao migrar usuários:', usersError);
    return;
  }
  
  console.log(`✅ ${users.length} usuários migrados`);
  
  // Migrar outras tabelas...
  // ...
  
  console.log('🎉 Migração concluída!');
}

migrateData().catch(console.error);
```

## 🧪 Testes e Validação

### Testar Conexão

```bash
# Testar conexão local
supabase status

# Testar conexão remota
psql "postgresql://postgres:[PASSWORD]@db.your-project-ref.supabase.co:5432/postgres"
```

### Testar API

```bash
# Testar endpoint de health
curl https://your-project-ref.supabase.co/rest/v1/

# Testar autenticação
curl -X POST https://your-project-ref.supabase.co/auth/v1/signup \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

### Testar RLS

```sql
-- Testar como usuário autenticado
SET request.jwt.claim.sub = 'user-uuid-here';
SELECT * FROM "users" WHERE id = 'user-uuid-here';

-- Testar como usuário anônimo
RESET request.jwt.claim.sub;
SELECT * FROM "users"; -- Deve retornar vazio se RLS estiver funcionando
```

## 📈 Monitoramento e Logs

### Dashboard do Supabase

- **Database**: Métricas de performance
- **Auth**: Usuários e sessões
- **Storage**: Uso de armazenamento
- **Edge Functions**: Logs de execução
- **Logs**: Logs em tempo real

### Logs via CLI

```bash
# Logs em tempo real
supabase logs --follow

# Logs de auth
supabase logs auth

# Logs de database
supabase logs db
```

### Métricas Importantes

- **Connections**: Número de conexões ativas
- **CPU Usage**: Uso de CPU do database
- **Memory Usage**: Uso de memória
- **Disk Usage**: Espaço em disco utilizado
- **Query Performance**: Tempo de resposta das queries

## 🔄 Backup e Restore

### Backup Automático

```bash
# Configurar backup diário
supabase db dump --data-only > "backup-$(date +%Y%m%d).sql"

# Agendar via cron (Linux/Mac)
echo "0 2 * * * cd /path/to/project && supabase db dump --data-only > backup-$(date +\%Y\%m\%d).sql" | crontab -
```

### Backup Manual

```bash
# Backup completo (schema + dados)
supabase db dump > full-backup.sql

# Backup apenas dados
supabase db dump --data-only > data-backup.sql

# Backup apenas schema
supabase db dump --schema-only > schema-backup.sql
```

### Restore

```bash
# Restore completo
supabase db reset
psql -h db.your-project-ref.supabase.co -U postgres -d postgres < full-backup.sql

# Restore apenas dados
psql -h db.your-project-ref.supabase.co -U postgres -d postgres < data-backup.sql
```

## 🚨 Troubleshooting

### Erro de Conexão
```
Error: connect ECONNREFUSED
```
**Solução**:
1. Verificar se URL e credenciais estão corretas
2. Verificar se projeto está ativo no Supabase
3. Testar conexão via psql

### Erro de Migração
```
Error: relation "users" already exists
```
**Solução**:
1. Usar `supabase db reset` para limpar
2. Ou usar `IF NOT EXISTS` nas migrações

### Erro de RLS
```
Error: new row violates row-level security policy
```
**Solução**:
1. Verificar políticas RLS
2. Usar service role key para operações admin
3. Configurar políticas adequadas

### Performance Issues
**Solução**:
1. Adicionar índices necessários
2. Otimizar queries
3. Usar connection pooling
4. Considerar upgrade do plano

## 🎯 Otimizações

### Índices

```sql
-- Índices para performance
CREATE INDEX CONCURRENTLY idx_users_email ON "users"(email);
CREATE INDEX CONCURRENTLY idx_messages_created_at ON "messages"("createdAt");
CREATE INDEX CONCURRENTLY idx_admirers_user_id ON "admirers"("userId");
```

### Connection Pooling

```bash
# Usar PgBouncer (incluído no Supabase)
DATABASE_URL="postgresql://postgres:[PASSWORD]@db.your-project-ref.supabase.co:5432/postgres?pgbouncer=true"
```

### Caching

```javascript
// Implementar cache no backend
const redis = require('redis');
const client = redis.createClient();

// Cache de queries frequentes
const getCachedUsers = async () => {
  const cached = await client.get('users:all');
  if (cached) return JSON.parse(cached);
  
  const users = await supabase.from('users').select('*');
  await client.setex('users:all', 300, JSON.stringify(users)); // 5 min cache
  
  return users;
};
```

## 🎉 Deploy Concluído!

Seu database está agora rodando no Supabase! 🚀

**Credenciais importantes:**
- **URL**: `https://your-project-ref.supabase.co`
- **Anon Key**: Para frontend
- **Service Role Key**: Para backend
- **Database URL**: Para Prisma

**Próximos passos:**
1. Configurar variáveis de ambiente no frontend e backend
2. Testar conexões e funcionalidades
3. Configurar CI/CD para migrações automáticas
4. Implementar monitoramento e alertas

## 📚 Recursos Adicionais

- [Documentação Supabase](https://supabase.com/docs)
- [Supabase CLI Reference](https://supabase.com/docs/reference/cli)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Prisma with Supabase](https://supabase.com/docs/guides/integrations/prisma)