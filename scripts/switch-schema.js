#!/usr/bin/env node

/**
 * Script para alternar entre schemas SQLite e PostgreSQL
 * Uso: node scripts/switch-schema.js [sqlite|postgresql]
 */

const fs = require('fs');
const path = require('path');

const SCHEMA_DIR = path.join(__dirname, '..', 'prisma');
const MAIN_SCHEMA = path.join(SCHEMA_DIR, 'schema.prisma');
const SQLITE_SCHEMA = path.join(SCHEMA_DIR, 'schema.sqlite.prisma');
const POSTGRESQL_SCHEMA = path.join(SCHEMA_DIR, 'schema.postgresql.prisma');

function switchSchema(target) {
  let sourceSchema;
  
  switch (target) {
    case 'sqlite':
      sourceSchema = SQLITE_SCHEMA;
      console.log('🔄 Alternando para schema SQLite...');
      break;
    case 'postgresql':
      sourceSchema = POSTGRESQL_SCHEMA;
      console.log('🔄 Alternando para schema PostgreSQL...');
      break;
    default:
      console.error('❌ Uso: node scripts/switch-schema.js [sqlite|postgresql]');
      process.exit(1);
  }
  
  if (!fs.existsSync(sourceSchema)) {
    console.error(`❌ Schema não encontrado: ${sourceSchema}`);
    process.exit(1);
  }
  
  try {
    // Backup do schema atual
    if (fs.existsSync(MAIN_SCHEMA)) {
      const backupPath = `${MAIN_SCHEMA}.backup.${Date.now()}`;
      fs.copyFileSync(MAIN_SCHEMA, backupPath);
      console.log(`📦 Backup criado: ${path.basename(backupPath)}`);
    }
    
    // Copia o schema desejado
    fs.copyFileSync(sourceSchema, MAIN_SCHEMA);
    console.log(`✅ Schema ${target} ativado com sucesso!`);
    
    // Mostra próximos passos
    console.log('\n📋 Próximos passos:');
    if (target === 'sqlite') {
      console.log('   1. Certifique-se que DATABASE_URL aponta para SQLite');
      console.log('   2. Execute: npx prisma generate');
      console.log('   3. Execute: npx prisma db push');
    } else {
      console.log('   1. Certifique-se que DATABASE_URL aponta para PostgreSQL');
      console.log('   2. Execute: npx prisma generate');
      console.log('   3. Execute: npx prisma migrate deploy');
    }
    
  } catch (error) {
    console.error('❌ Erro ao alternar schema:', error.message);
    process.exit(1);
  }
}

// Executa o script
const target = process.argv[2];
if (!target) {
  console.log('📋 Schemas disponíveis:');
  console.log('   • sqlite     - Para desenvolvimento/testes locais');
  console.log('   • postgresql - Para produção');
  console.log('\n💡 Uso: node scripts/switch-schema.js [sqlite|postgresql]');
  process.exit(0);
}

switchSchema(target);