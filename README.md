# 💕 Enigma Crush Backend

Backend API para o aplicativo Enigma Crush - uma plataforma de relacionamentos anônimos e interações sociais.

## 🚀 Características

- **Autenticação JWT** com refresh tokens
- **Upload de arquivos** com validação e otimização
- **Rate limiting** e proteção contra ataques
- **Validação de dados** com express-validator
- **Logs de auditoria** para monitoramento
- **Banco de dados** SQLite (desenvolvimento) / PostgreSQL (produção)
- **Containerização** com Docker
- **Health checks** para monitoramento
- **Segurança** com Helmet, CORS, XSS protection

## 📋 Pré-requisitos

- Node.js 18+ 
- npm ou yarn
- Docker e Docker Compose (para produção)
- PostgreSQL (para produção)

## 🛠️ Instalação

### Desenvolvimento

1. **Clone o repositório**
```bash
git clone <repository-url>
cd enigma-crush-backend
```

2. **Instale as dependências**
```bash
npm install
```

3. **Configure as variáveis de ambiente**
```bash
cp .env.example .env
# Edite o arquivo .env com suas configurações
```

4. **Configure o banco de dados**
```bash
# Gerar o Prisma Client
npm run prisma:generate

# Executar migrações
npm run migrate

# Popular o banco com dados de exemplo (opcional)
npm run db:seed
```

5. **Inicie o servidor de desenvolvimento**
```bash
npm run dev
```

O servidor estará rodando em `http://localhost:4006`

### Produção com Docker

1. **Configure as variáveis de ambiente**
```bash
cp .env.production .env
# Edite o arquivo .env com suas configurações de produção
```

2. **Execute o deploy**
```bash
# Torne o script executável (Linux/Mac)
chmod +x scripts/deploy.sh

# Execute o deploy
./scripts/deploy.sh
```

Ou manualmente:
```bash
# Build e start com Docker Compose
docker-compose up -d

# Execute as migrações
docker-compose exec app npx prisma migrate deploy
```

## 📁 Estrutura do Projeto

```
enigma-crush-backend/
├── prisma/                 # Esquemas e migrações do banco
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.js
├── src/
│   ├── controllers/        # Controladores da API
│   ├── middleware/         # Middlewares customizados
│   ├── routes/            # Definições de rotas
│   ├── services/          # Lógica de negócio
│   └── utils/             # Utilitários e helpers
├── scripts/               # Scripts de automação
│   ├── deploy.sh
│   └── health-check.js
├── uploads/               # Arquivos enviados pelos usuários
├── logs/                  # Logs da aplicação
├── docker-compose.yml     # Configuração Docker
├── Dockerfile            # Imagem Docker da aplicação
├── nginx.conf            # Configuração do Nginx
└── index.js              # Ponto de entrada da aplicação
```

## 🔧 Scripts Disponíveis

```bash
# Desenvolvimento
npm run dev              # Inicia servidor de desenvolvimento
npm run start            # Inicia servidor de produção
npm run start:prod       # Inicia com configurações otimizadas

# Banco de dados
npm run prisma:generate  # Gera o Prisma Client
npm run migrate          # Executa migrações
npm run db:seed          # Popula banco com dados de exemplo
npm run db:deploy        # Deploy de migrações (produção)

# Qualidade de código
npm run lint             # Executa ESLint
npm run lint:fix         # Corrige problemas do ESLint
npm run test             # Executa testes
npm run test:coverage    # Executa testes com cobertura
npm run test:prod        # Executa testes para produção

# Produção
npm run build            # Build da aplicação
npm run build:prod       # Build otimizado para produção
npm run health-check     # Verifica saúde da aplicação
npm run security-audit   # Auditoria de segurança

# Docker
npm run docker:build     # Build da imagem Docker
npm run docker:run       # Executa container Docker
```

## 🌐 Endpoints da API

### Autenticação
- `POST /api/auth/register` - Registro de usuário
- `POST /api/auth/login` - Login
- `POST /api/auth/refresh` - Renovar token
- `POST /api/auth/logout` - Logout

### Usuários
- `GET /api/users/profile` - Perfil do usuário
- `PUT /api/users/profile` - Atualizar perfil
- `POST /api/users/upload-avatar` - Upload de avatar

### Admiradores
- `GET /api/admirers` - Listar admiradores
- `POST /api/admirers` - Criar admirador
- `PUT /api/admirers/:id` - Atualizar admirador
- `DELETE /api/admirers/:id` - Deletar admirador

### Dicas
- `GET /api/hints` - Listar dicas
- `POST /api/hints` - Criar dica
- `PUT /api/hints/:id/reveal` - Revelar dica

### Mensagens
- `GET /api/messages` - Listar mensagens
- `POST /api/messages` - Enviar mensagem
- `PUT /api/messages/:id/read` - Marcar como lida

### Sistema
- `GET /api/health` - Health check
- `GET /` - Status da API

## 🔒 Segurança

### Medidas Implementadas

- **Helmet.js** - Headers de segurança
- **CORS** - Controle de origem cruzada
- **Rate Limiting** - Proteção contra spam/DDoS
- **XSS Protection** - Proteção contra XSS
- **SQL Injection** - Proteção via Prisma ORM
- **JWT Tokens** - Autenticação segura
- **Validação de entrada** - express-validator
- **Upload seguro** - Validação de tipos de arquivo
- **Logs de auditoria** - Monitoramento de ações

### Configurações de Produção

```env
# Sempre use HTTPS em produção
NODE_ENV=production
SSL_ENABLED=true

# Secrets fortes (256+ bits)
JWT_SECRET=your_super_secure_jwt_secret
REFRESH_TOKEN_SECRET=your_super_secure_refresh_secret
COOKIE_SECRET=your_super_secure_cookie_secret

# CORS restritivo
CORS_ORIGINS=https://yourdomain.com

# Rate limiting agressivo
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_WINDOW_MS=900000
```

## 📊 Monitoramento

### Health Check

O endpoint `/api/health` fornece informações sobre:
- Status da aplicação
- Conectividade do banco de dados
- Uso de memória
- Tempo de atividade
- Versão da aplicação

### Logs

Logs são salvos em:
- `logs/access.log` - Logs de acesso
- `logs/error.log` - Logs de erro
- `logs/audit.log` - Logs de auditoria
- `logs/deploy.log` - Logs de deploy

### Métricas

```bash
# Verificar status dos containers
docker-compose ps

# Ver logs em tempo real
docker-compose logs -f app

# Executar health check manual
npm run health-check
```

## 🚀 Deploy

### Ambiente de Produção

1. **Servidor recomendado**
   - CPU: 2+ cores
   - RAM: 4GB+
   - Disco: 20GB+ SSD
   - OS: Ubuntu 20.04+ / CentOS 8+

2. **Dependências do servidor**
```bash
# Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

3. **Deploy automatizado**
```bash
# Clone o repositório
git clone <repository-url>
cd enigma-crush-backend

# Configure variáveis de ambiente
cp .env.production .env
vim .env  # Edite com suas configurações

# Execute o deploy
./scripts/deploy.sh
```

## 🐛 Troubleshooting

### Problemas Comuns

1. **Erro de conexão com banco**
```bash
# Verifique se o PostgreSQL está rodando
docker-compose ps postgres

# Verifique os logs do banco
docker-compose logs postgres
```

2. **Erro de permissão de upload**
```bash
# Verifique permissões da pasta uploads
ls -la uploads/

# Corrija permissões se necessário
chmod 755 uploads/
```

3. **Health check falhando**
```bash
# Execute health check manual
npm run health-check

# Verifique logs da aplicação
docker-compose logs app
```

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

---

**Desenvolvido com ❤️ para conectar corações** 💕