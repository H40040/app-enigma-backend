#/bin/bash

# Aplicar migrações Prisma
npx prisma migrate deploy --schema /app/prisma/schema.prisma

# Iniciar o servidor
exec npm start