# Migração de Banco de Dados: SQLite → PostgreSQL

Este documento descreve o processo completo de migração do banco de dados do EnigmaCrush de SQLite para PostgreSQL.

## 📋 Pré-requisitos

### 1. Instalação do PostgreSQL

#### Windows
```bash
# Baixar e instalar do site oficial
# https://www.postgresql.org/download/windows/

# Ou via Chocolatey
choco install postgresql

# Ou via Scoop
scoop install postgresql
```

#### macOS
```bash
# Via Homebrew
brew install postgresql
brew services start postgresql

# Ou via PostgreSQL.app
# https://postgresapp.com/
```

#### Linux (Ubuntu/Debian)
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### 2. Configuração Inicial do PostgreSQL

```bash
# Acessar o PostgreSQL como superusuário
sudo -u postgres psql

# Criar usuário para a aplicação
CREATE USER enigmacrush WITH PASSWORD 'sua_senha_segura';

# Criar banco de dados
CREATE DATABASE enigmacrush OWNER enigmacrush;

# Conceder privilégios
GRANT ALL PRIVILEGES ON DATABASE enigmacrush TO enigmacrush;

# Sair do PostgreSQL
\q
```

## 🚀 Processo de Migração

### Passo 1: Configuração Automática

```bash
# Execute o script de configuração
node scripts/setup-postgresql.js
```

Este script irá:
- ✅ Solicitar credenciais do PostgreSQL
- ✅ Testar a conexão
- ✅ Atualizar o arquivo `.env`
- ✅ Atualizar o schema do Prisma
- ✅ Executar a migração inicial

### Passo 2: Migração dos Dados

```bash
# Execute o script de migração
node scripts/migrate-to-postgresql.js
```

Este script irá:
- 📦 Fazer backup completo dos dados SQLite
- 🚀 Migrar todos os dados para PostgreSQL
- 🔍 Validar a integridade da migração
- 📊 Exibir estatísticas comparativas

### Passo 3: Verificação

```bash
# Gerar cliente Prisma atualizado
npx prisma generate

# Verificar status da migração
npx prisma migrate status

# Visualizar dados no Prisma Studio
npx prisma studio

# Testar a aplicação
npm start
```

## 📁 Estrutura de Arquivos

```
enigma-crush-backend/
├── prisma/
│   ├── schema.prisma              # Schema principal (será atualizado)
│   ├── schema.postgresql.prisma   # Schema PostgreSQL
│   ├── dev.db                     # Banco SQLite original
│   └── migrations/                # Migrações do Prisma
├── scripts/
│   ├── setup-postgresql.js        # Configuração inicial
│   └── migrate-to-postgresql.js   # Script de migração
├── backups/                       # Backups automáticos
│   └── sqlite-backup-*.json       # Backup dos dados SQLite
└── docs/
    └── DATABASE_MIGRATION.md      # Este documento
```

## 🔧 Configuração Manual (Alternativa)

### 1. Atualizar Variáveis de Ambiente

```env
# .env
DATABASE_URL="postgresql://enigmacrush:sua_senha@localhost:5432/enigmacrush?schema=public"
POSTGRESQL_URL="postgresql://enigmacrush:sua_senha@localhost:5432/enigmacrush?schema=public"
```

### 2. Atualizar Schema Prisma

```bash
# Copiar schema PostgreSQL
cp prisma/schema.postgresql.prisma prisma/schema.prisma

# Gerar cliente
npx prisma generate

# Executar migração
npx prisma migrate dev --name init-postgresql
```

### 3. Migração Manual dos Dados

```bash
# Executar script de migração
node scripts/migrate-to-postgresql.js
```

## 📊 Modelos de Dados

### Modelos Principais
- **User**: Usuários do sistema
- **Admirer**: Admiradores secretos
- **Hint**: Dicas dos admiradores
- **Interaction**: Interações com dicas
- **Message**: Mensagens enviadas
- **Reply**: Respostas às mensagens

### Novos Modelos (PostgreSQL)
- **AuditLog**: Logs de auditoria
- **UserSession**: Sessões de usuário
- **RateLimit**: Controle de rate limiting

## 🔍 Validação da Migração

### Verificações Automáticas
- ✅ Contagem de registros por tabela
- ✅ Integridade referencial
- ✅ Tipos de dados
- ✅ Índices e constraints

### Verificações Manuais

```sql
-- Conectar ao PostgreSQL
psql -h localhost -U enigmacrush -d enigmacrush

-- Verificar tabelas
\dt

-- Contar registros
SELECT 'users' as table_name, COUNT(*) as count FROM "User"
UNION ALL
SELECT 'messages', COUNT(*) FROM "Message"
UNION ALL
SELECT 'admirers', COUNT(*) FROM "Admirer"
UNION ALL
SELECT 'hints', COUNT(*) FROM "Hint"
UNION ALL
SELECT 'interactions', COUNT(*) FROM "Interaction"
UNION ALL
SELECT 'replies', COUNT(*) FROM "Reply";

-- Verificar relacionamentos
SELECT u.name, COUNT(a.id) as admirers_count
FROM "User" u
LEFT JOIN "Admirer" a ON u.id = a."userId"
GROUP BY u.id, u.name
ORDER BY admirers_count DESC;
```

## 🚨 Troubleshooting

### Erro de Conexão
```
Error: P1001: Can't reach database server
```
**Solução:**
- Verificar se PostgreSQL está rodando
- Confirmar credenciais no `.env`
- Testar conexão manual: `psql -h localhost -U enigmacrush -d enigmacrush`

### Erro de Permissão
```
Error: P3014: The datasource provider `postgresql` specified in your schema does not match
```
**Solução:**
- Executar `npx prisma generate` após atualizar o schema
- Verificar se o schema.prisma está usando `provider = "postgresql"`

### Erro de Migração
```
Error: P3005: The database schema is not empty
```
**Solução:**
- Limpar banco: `npx prisma migrate reset`
- Ou usar flag: `npx prisma migrate dev --create-only`

### Dados Inconsistentes
```
Validação falhou! Alguns dados podem não ter sido migrados
```
**Solução:**
- Verificar logs detalhados
- Executar migração novamente
- Verificar integridade referencial no SQLite original

## 📈 Performance

### Otimizações PostgreSQL

```sql
-- Criar índices adicionais
CREATE INDEX idx_user_email ON "User"(email);
CREATE INDEX idx_user_cpf ON "User"(cpf);
CREATE INDEX idx_message_created ON "Message"("createdAt");
CREATE INDEX idx_hint_type ON "Hint"(type);

-- Analisar tabelas
ANALYZE;
```

### Configurações Recomendadas

```sql
-- postgresql.conf
shared_buffers = 256MB
effective_cache_size = 1GB
maintenance_work_mem = 64MB
checkpoint_completion_target = 0.9
wal_buffers = 16MB
default_statistics_target = 100
```

## 🔄 Rollback (Se Necessário)

### Voltar para SQLite

```bash
# 1. Restaurar backup do schema
cp prisma/schema.prisma.backup.* prisma/schema.prisma

# 2. Restaurar backup do .env
cp .env.backup.* .env

# 3. Gerar cliente SQLite
npx prisma generate

# 4. Testar aplicação
npm start
```

## 📝 Checklist de Migração

- [ ] PostgreSQL instalado e configurado
- [ ] Usuário e banco criados
- [ ] Backup dos dados SQLite realizado
- [ ] Schema Prisma atualizado
- [ ] Variáveis de ambiente configuradas
- [ ] Migração executada com sucesso
- [ ] Dados validados
- [ ] Aplicação testada
- [ ] Performance verificada
- [ ] Backups organizados

## 🎯 Próximos Passos

Após a migração bem-sucedida:

1. **Monitoramento**: Configurar logs e métricas
2. **Backup**: Implementar rotina de backup automático
3. **Otimização**: Ajustar configurações de performance
4. **Segurança**: Revisar permissões e acessos
5. **Documentação**: Atualizar documentação da API

---

**📞 Suporte**: Em caso de problemas, consulte os logs em `backups/` ou abra uma issue no repositório.