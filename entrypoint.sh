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
npx prisma generate

if [ $? -ne 0 ]; then
    echo "❌ Failed to generate Prisma client"
    exit 1
fi

# Verificar status das migrações antes de aplicar
echo "🔍 Checking migration status before deploy..."
npx prisma migrate status

# Aplicar migrações Prisma
echo "🔄 Applying database migrations..."
echo "📊 Current migration status:"
npx prisma migrate status

echo "🗂️ Available migration files:"
ls -la prisma/migrations/

echo "🔄 Forcing migration deployment..."
if npx prisma migrate deploy --force; then
    echo "✅ Migrations applied successfully"
else
    echo "❌ Migration failed. Trying to reset and apply..."
    echo "🔄 Resetting database and applying migrations..."
    npx prisma migrate reset --force --skip-seed
    if npx prisma migrate deploy; then
        echo "✅ Migrations applied after reset"
    else
        echo "❌ Migration still failed. Manual intervention required."
        exit 1
    fi
fi

# Executar script SQL adicional para sincronizar schema
echo "🔧 Applying schema synchronization..."
if [ -f "prisma/migrations/add_missing_columns.sql" ]; then
    psql "$DATABASE_URL" -f prisma/migrations/add_missing_columns.sql
    if [ $? -eq 0 ]; then
        echo "✅ Schema synchronization completed"
    else
        echo "⚠️ Schema synchronization failed, but continuing..."
    fi
else
    echo "⚠️ Schema sync file not found, skipping..."
fi
echo "🔍 Final migration status..."
npx prisma migrate status
echo "🚀 Starting server..."

# Iniciar o servidor
exec npm start