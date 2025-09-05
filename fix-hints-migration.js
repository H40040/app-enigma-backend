const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  const prisma = new PrismaClient();

  try {
    console.log('🔄 Executando migração das colunas faltantes na tabela hints...');

    // Ler o arquivo SQL de migração
    const migrationPath = path.join(__dirname, 'prisma', 'migrations', 'add_missing_columns.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    // Executar a migração
    await prisma.$executeRawUnsafe(migrationSQL);

    console.log('✅ Migração executada com sucesso!');
    console.log('📋 Colunas adicionadas: publicUrl, qrCodeUrl à tabela hints');

  } catch (error) {
    console.error('❌ Erro ao executar migração:', error);
  } finally {
    await prisma.$disconnect();
  }
}

runMigration();
