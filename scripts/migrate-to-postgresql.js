#!/usr/bin/env node

/**
 * Script de Migração: SQLite para PostgreSQL
 * 
 * Este script migra os dados do banco SQLite atual para PostgreSQL
 * Uso: node scripts/migrate-to-postgresql.js
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

// Configuração dos bancos
const sqliteClient = new PrismaClient({
  datasources: {
    db: {
      url: 'file:../prisma/dev.db'
    }
  }
});

const postgresClient = new PrismaClient({
  datasources: {
    db: {
      url: process.env.POSTGRESQL_URL || process.env.DATABASE_URL
    }
  }
});

async function backupSQLiteData() {
  console.log('📦 Fazendo backup dos dados do SQLite...');
  
  try {
    const users = await sqliteClient.user.findMany({
      include: {
        admirers: {
          include: {
            hints: {
              include: {
                interaction: true
              }
            }
          }
        }
      }
    });
    
    const messages = await sqliteClient.message.findMany({
      include: {
        replies: true
      }
    });
    
    const backup = {
      timestamp: new Date().toISOString(),
      users,
      messages,
      stats: {
        usersCount: users.length,
        messagesCount: messages.length,
        admirersCount: users.reduce((acc, user) => acc + user.admirers.length, 0),
        hintsCount: users.reduce((acc, user) => 
          acc + user.admirers.reduce((acc2, admirer) => acc2 + admirer.hints.length, 0), 0
        ),
        interactionsCount: users.reduce((acc, user) => 
          acc + user.admirers.reduce((acc2, admirer) => 
            acc2 + admirer.hints.reduce((acc3, hint) => acc3 + hint.interaction.length, 0), 0
          ), 0
        ),
        repliesCount: messages.reduce((acc, message) => acc + message.replies.length, 0)
      }
    };
    
    const backupPath = path.join(__dirname, '..', 'backups', `sqlite-backup-${Date.now()}.json`);
    
    // Criar diretório de backup se não existir
    const backupDir = path.dirname(backupPath);
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    
    fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2));
    
    console.log('✅ Backup criado com sucesso!');
    console.log(`📁 Arquivo: ${backupPath}`);
    console.log('📊 Estatísticas do backup:');
    console.log(`   - Usuários: ${backup.stats.usersCount}`);
    console.log(`   - Mensagens: ${backup.stats.messagesCount}`);
    console.log(`   - Admiradores: ${backup.stats.admirersCount}`);
    console.log(`   - Dicas: ${backup.stats.hintsCount}`);
    console.log(`   - Interações: ${backup.stats.interactionsCount}`);
    console.log(`   - Respostas: ${backup.stats.repliesCount}`);
    
    return backup;
  } catch (error) {
    console.error('❌ Erro ao fazer backup:', error);
    throw error;
  }
}

async function migrateData(backup) {
  console.log('🚀 Iniciando migração para PostgreSQL...');
  
  try {
    // Limpar dados existentes (cuidado em produção!)
    console.log('🧹 Limpando dados existentes...');
    await postgresClient.reply.deleteMany();
    await postgresClient.message.deleteMany();
    await postgresClient.interaction.deleteMany();
    await postgresClient.hint.deleteMany();
    await postgresClient.admirer.deleteMany();
    await postgresClient.user.deleteMany();
    
    console.log('👥 Migrando usuários...');
    for (const user of backup.users) {
      await postgresClient.user.create({
        data: {
          id: user.id,
          email: user.email,
          password: user.password,
          name: user.name,
          birthdate: new Date(user.birthdate),
          cpf: user.cpf,
          whatsapp: user.whatsapp,
          createdAt: new Date(user.createdAt),
          updatedAt: new Date(user.updatedAt),
          lastLogin: user.lastLogin ? new Date(user.lastLogin) : null,
          isAdmin: user.isAdmin
        }
      });
    }
    
    console.log('💝 Migrando admiradores e dicas...');
    for (const user of backup.users) {
      for (const admirer of user.admirers) {
        const createdAdmirer = await postgresClient.admirer.create({
          data: {
            id: admirer.id,
            userId: admirer.userId,
            createdAt: new Date(admirer.createdAt)
          }
        });
        
        for (const hint of admirer.hints) {
          const createdHint = await postgresClient.hint.create({
            data: {
              id: hint.id,
              content: hint.content,
              type: hint.type,
              views: hint.views,
              interactions: hint.interactions,
              admirerId: hint.admirerId,
              createdAt: new Date(hint.createdAt)
            }
          });
          
          for (const interaction of hint.interaction) {
            await postgresClient.interaction.create({
              data: {
                id: interaction.id,
                content: interaction.content,
                answer: interaction.answer,
                hintId: interaction.hintId,
                createdAt: new Date(interaction.createdAt),
                answeredAt: interaction.answeredAt ? new Date(interaction.answeredAt) : null
              }
            });
          }
        }
      }
    }
    
    console.log('💌 Migrando mensagens...');
    for (const message of backup.messages) {
      const createdMessage = await postgresClient.message.create({
        data: {
          id: message.id,
          senderId: message.senderId,
          recipientId: message.recipientId,
          recipientUsername: message.recipientUsername,
          recipientEmail: message.recipientEmail,
          recipientPhone: message.recipientPhone,
          contactMethod: message.contactMethod,
          content: message.content,
          imageUrl: message.imageUrl,
          createdAt: new Date(message.createdAt),
          isRead: message.isRead,
          views: message.views
        }
      });
      
      for (const reply of message.replies) {
        await postgresClient.reply.create({
          data: {
            id: reply.id,
            messageId: reply.messageId,
            content: reply.content,
            createdAt: new Date(reply.createdAt),
            fromRecipient: reply.fromRecipient
          }
        });
      }
    }
    
    console.log('✅ Migração concluída com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro durante a migração:', error);
    throw error;
  }
}

async function validateMigration(backup) {
  console.log('🔍 Validando migração...');
  
  try {
    const postgresUsers = await postgresClient.user.count();
    const postgresMessages = await postgresClient.message.count();
    const postgresAdmirers = await postgresClient.admirer.count();
    const postgresHints = await postgresClient.hint.count();
    const postgresInteractions = await postgresClient.interaction.count();
    const postgresReplies = await postgresClient.reply.count();
    
    console.log('📊 Comparação de dados:');
    console.log(`   Usuários: SQLite=${backup.stats.usersCount}, PostgreSQL=${postgresUsers} ${postgresUsers === backup.stats.usersCount ? '✅' : '❌'}`);
    console.log(`   Mensagens: SQLite=${backup.stats.messagesCount}, PostgreSQL=${postgresMessages} ${postgresMessages === backup.stats.messagesCount ? '✅' : '❌'}`);
    console.log(`   Admiradores: SQLite=${backup.stats.admirersCount}, PostgreSQL=${postgresAdmirers} ${postgresAdmirers === backup.stats.admirersCount ? '✅' : '❌'}`);
    console.log(`   Dicas: SQLite=${backup.stats.hintsCount}, PostgreSQL=${postgresHints} ${postgresHints === backup.stats.hintsCount ? '✅' : '❌'}`);
    console.log(`   Interações: SQLite=${backup.stats.interactionsCount}, PostgreSQL=${postgresInteractions} ${postgresInteractions === backup.stats.interactionsCount ? '✅' : '❌'}`);
    console.log(`   Respostas: SQLite=${backup.stats.repliesCount}, PostgreSQL=${postgresReplies} ${postgresReplies === backup.stats.repliesCount ? '✅' : '❌'}`);
    
    const isValid = (
      postgresUsers === backup.stats.usersCount &&
      postgresMessages === backup.stats.messagesCount &&
      postgresAdmirers === backup.stats.admirersCount &&
      postgresHints === backup.stats.hintsCount &&
      postgresInteractions === backup.stats.interactionsCount &&
      postgresReplies === backup.stats.repliesCount
    );
    
    if (isValid) {
      console.log('✅ Validação bem-sucedida! Todos os dados foram migrados corretamente.');
    } else {
      console.log('❌ Validação falhou! Alguns dados podem não ter sido migrados corretamente.');
    }
    
    return isValid;
    
  } catch (error) {
    console.error('❌ Erro durante a validação:', error);
    throw error;
  }
}

async function main() {
  console.log('🔄 Iniciando processo de migração SQLite → PostgreSQL');
  console.log('=' .repeat(60));
  
  try {
    // Verificar conexões
    console.log('🔌 Testando conexões...');
    await sqliteClient.$connect();
    await postgresClient.$connect();
    console.log('✅ Conexões estabelecidas!');
    
    // Fazer backup
    const backup = await backupSQLiteData();
    
    // Migrar dados
    await migrateData(backup);
    
    // Validar migração
    const isValid = await validateMigration(backup);
    
    if (isValid) {
      console.log('\n🎉 Migração concluída com sucesso!');
      console.log('\n📝 Próximos passos:');
      console.log('   1. Atualize o arquivo .env para usar PostgreSQL');
      console.log('   2. Execute: npx prisma generate');
      console.log('   3. Teste a aplicação');
      console.log('   4. Faça backup do arquivo SQLite original');
    } else {
      console.log('\n⚠️  Migração concluída com problemas. Verifique os logs acima.');
    }
    
  } catch (error) {
    console.error('\n💥 Erro fatal durante a migração:', error);
    process.exit(1);
  } finally {
    await sqliteClient.$disconnect();
    await postgresClient.$disconnect();
  }
}

// Executar apenas se chamado diretamente
if (require.main === module) {
  main();
}

module.exports = { backupSQLiteData, migrateData, validateMigration };