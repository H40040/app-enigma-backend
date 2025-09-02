# --- Dockerfile ---

# Usar Node 22.12.0
FROM node:22.12.0

# Definir diretório de trabalho
WORKDIR /usr/src/app/enigma-crush-backend

# Copiar arquivos de dependências primeiro (cache eficiente)
COPY package*.json ./

# Instalar dependências
RUN npm ci && npx prisma generate && npx prisma migrate deploy


# Copiar código fonte
COPY . .

# Build (ajuste se for backend puro ou fullstack)
RUN npm start

# Expor a porta que o backend usa
EXPOSE 3000

# Rodar o backend em produção
CMD ["npm", "start"]
