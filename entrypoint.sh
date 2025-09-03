#!/bin/bash

echo "🚀 Starting Enigma Crush Backend..."
echo "📊 Environment: $NODE_ENV"
echo "🔌 Port: $PORT"
echo "🗄️ Database URL: ${DATABASE_URL:0:30}..."

# Verificar se o Prisma está configurado
echo "🔍 Checking Prisma configuration..."
npx prisma --version

# Gerar cliente Prisma
echo "⚙️ Generating Prisma client..."
npx prisma generate --schema /app/prisma/schema.prisma

if [ $? -ne 0 ]; then
    echo "❌ Failed to generate Prisma client"
    exit 1
fi

# Aplicar migrações Prisma
echo "🔄 Applying Prisma migrations..."
npx prisma migrate deploy --schema /app/prisma/schema.prisma

if [ $? -ne 0 ]; then
    echo "❌ Failed to apply migrations"
    echo "🔍 Checking migration status..."
    npx prisma migrate status --schema /app/prisma/schema.prisma
    exit 1
fi

echo "✅ Migrations applied successfully"
echo "🚀 Starting server..."

# Iniciar o servidor
exec npm start