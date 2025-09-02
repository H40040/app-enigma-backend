# --- Dockerfile ---
# Backend Node.js puro + Prisma

FROM node:22.12.0

# Diretório de trabalho
WORKDIR /app

# Copiar dependências primeiro (cache eficiente)
COPY package*.json ./

# Instalar dependências (produção)
RUN npm ci --omit=dev --no-audit --progress=false

# Copiar código fonte
COPY . .

# Gerar cliente Prisma e aplicar migrações
RUN npx prisma generate
RUN npx prisma migrate deploy

# Expor porta da API
EXPOSE 4006

# Start do servidor
CMD ["npm", "start"]
