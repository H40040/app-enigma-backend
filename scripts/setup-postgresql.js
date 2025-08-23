#!/usr/bin/env node

/**
 * Script de Configuração PostgreSQL
 * 
 * Este script ajuda na configuração inicial do PostgreSQL
 * Uso: node scripts/setup-postgresql.js
 */

require('dotenv').config();
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

function generateDatabaseUrl(config) {
  const { username, password, host, port, database } = config;
  return `postgresql://${username}:${password}@${host}:${port}/${database}?schema=public`;
}

function updateEnvFile(databaseUrl) {
  const envPath = path.join(__dirname, '..', '.env');
  
  if (!fs.existsSync(envPath)) {
    console.log('❌ Arquivo .env não encontrado!');
    return false;
  }
  
  let envContent = fs.readFileSync(envPath, 'utf8');
  
  // Backup do .env atual
  const backupPath = `${envPath}.backup.${Date.now()}`;
  fs.writeFileSync(backupPath, envContent);
  console.log(`📦 Backup do .env criado: ${backupPath}`);
  
  // Atualizar DATABASE_URL
  if (envContent.includes('DATABASE_URL=')) {
    envContent = envContent.replace(/DATABASE_URL=.*/, `DATABASE_URL="${databaseUrl}"`);
  } else {
    envContent += `\nDATABASE_URL="${databaseUrl}"`;
  }
  
  // Adicionar POSTGRESQL_URL se não existir
  if (!envContent.includes('POSTGRESQL_URL=')) {
    envContent += `\nPOSTGRESQL_URL="${databaseUrl}"`;
  }
  
  fs.writeFileSync(envPath, envContent);
  console.log('✅ Arquivo .env atualizado!');
  
  return true;
}

function updatePrismaSchema() {
  const schemaPath = path.join(__dirname, '..', 'prisma', 'schema.prisma');
  const postgresSchemaPath = path.join(__dirname, '..', 'prisma', 'schema.postgresql.prisma');
  
  if (!fs.existsSync(postgresSchemaPath)) {
    console.log('❌ Arquivo schema.postgresql.prisma não encontrado!');
    return false;
  }
  
  // Backup do schema atual
  if (fs.existsSync(schemaPath)) {
    const backupPath = `${schemaPath}.backup.${Date.now()}`;
    fs.copyFileSync(schemaPath, backupPath);
    console.log(`📦 Backup do schema.prisma criado: ${backupPath}`);
  }
  
  // Copiar schema PostgreSQL
  fs.copyFileSync(postgresSchemaPath, schemaPath);
  console.log('✅ Schema Prisma atualizado para PostgreSQL!');
  
  return true;
}

function testConnection(databaseUrl) {
  console.log('🔌 Testando conexão com PostgreSQL...');
  
  try {
    // Criar um arquivo temporário de teste
    const testScript = `
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: '${databaseUrl}'
    }
  }
});

async function test() {
  try {
    await prisma.$connect();
    console.log('✅ Conexão bem-sucedida!');
    await prisma.$disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro de conexão:', error.message);
    process.exit(1);
  }
}

test();
`;
    
    const testPath = path.join(__dirname, 'test-connection.js');
    fs.writeFileSync(testPath, testScript);
    
    execSync(`node ${testPath}`, { stdio: 'inherit' });
    
    // Limpar arquivo de teste
    fs.unlinkSync(testPath);
    
    return true;
  } catch (error) {
    console.error('❌ Falha na conexão:', error.message);
    return false;
  }
}

function runPrismaMigration() {
  console.log('🔄 Executando migração do Prisma...');
  
  try {
    // Gerar cliente Prisma
    console.log('📦 Gerando cliente Prisma...');
    execSync('npx prisma generate', { stdio: 'inherit' });
    
    // Executar migração
    console.log('🚀 Executando migração...');
    execSync('npx prisma migrate dev --name init-postgresql', { stdio: 'inherit' });
    
    console.log('✅ Migração concluída!');
    return true;
  } catch (error) {
    console.error('❌ Erro na migração:', error.message);
    return false;
  }
}

async function main() {
  console.log('🐘 Configuração do PostgreSQL para EnigmaCrush');
  console.log('=' .repeat(50));
  
  try {
    console.log('\n📋 Vamos configurar a conexão com PostgreSQL...');
    console.log('\n💡 Certifique-se de que o PostgreSQL está instalado e rodando!');
    
    const config = {};
    
    // Coletar informações de conexão
    config.host = await question('🌐 Host do PostgreSQL (padrão: localhost): ') || 'localhost';
    config.port = await question('🔌 Porta do PostgreSQL (padrão: 5432): ') || '5432';
    config.database = await question('🗄️  Nome do banco de dados (padrão: enigmacrush): ') || 'enigmacrush';
    config.username = await question('👤 Usuário do PostgreSQL: ');
    
    if (!config.username) {
      console.log('❌ Usuário é obrigatório!');
      process.exit(1);
    }
    
    config.password = await question('🔐 Senha do PostgreSQL: ');
    
    if (!config.password) {
      console.log('❌ Senha é obrigatória!');
      process.exit(1);
    }
    
    const databaseUrl = generateDatabaseUrl(config);
    
    console.log('\n📝 Configuração:');
    console.log(`   Host: ${config.host}`);
    console.log(`   Porta: ${config.port}`);
    console.log(`   Banco: ${config.database}`);
    console.log(`   Usuário: ${config.username}`);
    console.log(`   URL: postgresql://${config.username}:***@${config.host}:${config.port}/${config.database}?schema=public`);
    
    const confirm = await question('\n✅ Confirma a configuração? (s/N): ');
    
    if (confirm.toLowerCase() !== 's' && confirm.toLowerCase() !== 'sim') {
      console.log('❌ Configuração cancelada.');
      process.exit(0);
    }
    
    // Testar conexão
    const connectionOk = testConnection(databaseUrl);
    
    if (!connectionOk) {
      console.log('❌ Não foi possível conectar ao PostgreSQL.');
      console.log('\n🔧 Verifique:');
      console.log('   - Se o PostgreSQL está rodando');
      console.log('   - Se as credenciais estão corretas');
      console.log('   - Se o banco de dados existe');
      process.exit(1);
    }
    
    // Atualizar arquivos de configuração
    console.log('\n🔧 Atualizando configurações...');
    
    if (!updateEnvFile(databaseUrl)) {
      console.log('❌ Erro ao atualizar .env');
      process.exit(1);
    }
    
    if (!updatePrismaSchema()) {
      console.log('❌ Erro ao atualizar schema Prisma');
      process.exit(1);
    }
    
    // Executar migração
    const runMigration = await question('\n🚀 Executar migração do Prisma agora? (S/n): ');
    
    if (runMigration.toLowerCase() !== 'n' && runMigration.toLowerCase() !== 'não') {
      if (!runPrismaMigration()) {
        console.log('❌ Erro na migração. Execute manualmente: npx prisma migrate dev');
      }
    }
    
    console.log('\n🎉 Configuração do PostgreSQL concluída!');
    console.log('\n📝 Próximos passos:');
    console.log('   1. Execute o script de migração: node scripts/migrate-to-postgresql.js');
    console.log('   2. Teste a aplicação: npm start');
    console.log('   3. Verifique se tudo está funcionando corretamente');
    
  } catch (error) {
    console.error('\n💥 Erro durante a configuração:', error);
    process.exit(1);
  } finally {
    rl.close();
  }
}

// Executar apenas se chamado diretamente
if (require.main === module) {
  main();
}

module.exports = { generateDatabaseUrl, updateEnvFile, updatePrismaSchema, testConnection };