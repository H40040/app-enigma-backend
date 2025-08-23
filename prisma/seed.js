const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const { faker } = require('@faker-js/faker');

const prisma = new PrismaClient();

// Configurar faker para português brasileiro
faker.locale = 'pt_BR';

// Função para gerar CPF válido
function generateCPF() {
  const digits = [];
  
  // Gerar os 9 primeiros dígitos
  for (let i = 0; i < 9; i++) {
    digits.push(Math.floor(Math.random() * 10));
  }
  
  // Calcular primeiro dígito verificador
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += digits[i] * (10 - i);
  }
  let remainder = sum % 11;
  digits.push(remainder < 2 ? 0 : 11 - remainder);
  
  // Calcular segundo dígito verificador
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += digits[i] * (11 - i);
  }
  remainder = sum % 11;
  digits.push(remainder < 2 ? 0 : 11 - remainder);
  
  return digits.join('');
}

// Função para gerar WhatsApp válido
function generateWhatsApp() {
  const ddd = faker.helpers.arrayElement(['11', '21', '31', '41', '51', '61', '71', '81', '85', '91']);
  const number = '9' + faker.string.numeric(8);
  return `${ddd}${number}`;
}

// Função para criar usuários de teste
async function createTestUsers() {
  console.log('👥 Criando usuários de teste...');
  
  const users = [];
  
  // Usuário admin
  const adminPassword = await bcrypt.hash('admin123', 12);
  const admin = await prisma.user.create({
    data: {
      email: 'admin@enigmacrush.com',
      password: adminPassword,
      name: 'Administrador',
      birthdate: new Date('1990-01-01'),
      cpf: generateCPF(),
      whatsapp: generateWhatsApp(),
      isAdmin: true
    }
  });
  users.push(admin);
  
  // Usuários regulares
  for (let i = 0; i < 10; i++) {
    const password = await bcrypt.hash('123456', 12);
    const user = await prisma.user.create({
      data: {
        email: faker.internet.email(),
        password,
        name: faker.person.fullName(),
        birthdate: faker.date.birthdate({ min: 18, max: 50, mode: 'age' }),
        cpf: generateCPF(),
        whatsapp: generateWhatsApp(),
        isAdmin: false
      }
    });
    users.push(user);
  }
  
  console.log(`✅ ${users.length} usuários criados`);
  return users;
}

// Função para criar admiradores e dicas
async function createAdmirersAndHints(users) {
  console.log('💝 Criando admiradores e dicas...');
  
  const hintTypes = ['personality', 'appearance', 'hobby', 'memory', 'compliment'];
  const hintContents = {
    personality: [
      'Você tem um sorriso que ilumina qualquer ambiente',
      'Sua gentileza é contagiante',
      'Admiro sua determinação em tudo que faz',
      'Você tem uma energia muito positiva',
      'Sua inteligência me impressiona'
    ],
    appearance: [
      'Seus olhos são hipnotizantes',
      'Você tem um estilo único e marcante',
      'Sua presença é magnética',
      'Você sempre está bem arrumado(a)',
      'Seu cabelo é lindo'
    ],
    hobby: [
      'Admiro sua paixão pela música',
      'Você é incrível nos esportes',
      'Sua criatividade artística me fascina',
      'Você cozinha divinamente',
      'Sua dedicação aos estudos é admirável'
    ],
    memory: [
      'Lembro do dia que nos conhecemos',
      'Aquela conversa que tivemos foi especial',
      'Você me ajudou quando eu precisava',
      'Sempre me lembro do seu riso',
      'Você tornou aquele momento inesquecível'
    ],
    compliment: [
      'Você é uma pessoa incrível',
      'Tenho muito carinho por você',
      'Você merece toda felicidade do mundo',
      'Você é especial de um jeito único',
      'Admiro muito quem você é'
    ]
  };
  
  let admirersCount = 0;
  let hintsCount = 0;
  
  for (const user of users) {
    // Cada usuário pode ter de 1 a 3 admiradores
    const admirersForUser = faker.number.int({ min: 1, max: 3 });
    
    for (let i = 0; i < admirersForUser; i++) {
      const admirer = await prisma.admirer.create({
        data: {
          userId: user.id,
          createdAt: faker.date.recent({ days: 30 })
        }
      });
      admirersCount++;
      
      // Cada admirador pode ter de 2 a 5 dicas
      const hintsForAdmirer = faker.number.int({ min: 2, max: 5 });
      
      for (let j = 0; j < hintsForAdmirer; j++) {
        const type = faker.helpers.arrayElement(hintTypes);
        const content = faker.helpers.arrayElement(hintContents[type]);
        
        await prisma.hint.create({
          data: {
            content,
            type,
            views: faker.number.int({ min: 0, max: 10 }),
            interactions: faker.number.int({ min: 0, max: 5 }),
            admirerId: admirer.id,
            createdAt: faker.date.recent({ days: 20 })
          }
        });
        hintsCount++;
      }
    }
  }
  
  console.log(`✅ ${admirersCount} admiradores e ${hintsCount} dicas criados`);
}

// Função para criar mensagens
async function createMessages(users) {
  console.log('💌 Criando mensagens...');
  
  const messageContents = [
    'Oi! Descobri quem você é através das dicas e queria te conhecer melhor.',
    'Suas dicas me conquistaram! Podemos conversar?',
    'Finalmente descobri quem é meu admirador secreto! 😊',
    'Que dicas lindas! Você parece ser uma pessoa incrível.',
    'Obrigado(a) pelas palavras carinhosas. Gostaria de te conhecer!',
    'Suas dicas me fizeram sorrir muito. Vamos nos conhecer?',
    'Que surpresa maravilhosa descobrir quem você é!',
    'Adorei suas dicas! Você tem um jeito especial de se expressar.',
    'Fiquei curioso(a) para te conhecer melhor depois dessas dicas.',
    'Suas palavras foram muito tocantes. Obrigado(a)!'
  ];
  
  const contactMethods = ['email', 'whatsapp', 'phone'];
  let messagesCount = 0;
  
  for (let i = 0; i < 15; i++) {
    const sender = faker.helpers.arrayElement(users);
    const recipient = faker.helpers.arrayElement(users.filter(u => u.id !== sender.id));
    const contactMethod = faker.helpers.arrayElement(contactMethods);
    
    const message = await prisma.message.create({
      data: {
        senderId: sender.id,
        recipientId: recipient.id,
        recipientUsername: recipient.name,
        recipientEmail: recipient.email,
        recipientPhone: recipient.whatsapp,
        contactMethod,
        content: faker.helpers.arrayElement(messageContents),
        createdAt: faker.date.recent({ days: 15 }),
        isRead: faker.datatype.boolean(),
        views: faker.number.int({ min: 0, max: 3 })
      }
    });
    messagesCount++;
    
    // Algumas mensagens podem ter respostas
    if (faker.datatype.boolean(0.4)) {
      await prisma.reply.create({
        data: {
          messageId: message.id,
          content: 'Obrigado(a) pela mensagem! Também gostaria de te conhecer melhor.',
          createdAt: faker.date.recent({ days: 10 }),
          fromRecipient: true
        }
      });
    }
  }
  
  console.log(`✅ ${messagesCount} mensagens criadas`);
}

// Função para criar interações
async function createInteractions() {
  console.log('🎯 Criando interações...');
  
  const hints = await prisma.hint.findMany();
  let interactionsCount = 0;
  
  for (const hint of hints) {
    // Algumas dicas podem ter interações
    if (faker.datatype.boolean(0.3)) {
      const interactionContent = faker.helpers.arrayElement([
        'Essa dica me fez pensar...',
        'Será que eu conheço essa pessoa?',
        'Que dica interessante!',
        'Estou tentando descobrir quem é...',
        'Essa descrição combina comigo?'
      ]);
      
      await prisma.interaction.create({
        data: {
          content: interactionContent,
          answer: faker.datatype.boolean(0.6) ? faker.helpers.arrayElement([
            'Sim, acho que sei quem é!',
            'Não, não combina comigo.',
            'Talvez... preciso pensar mais.',
            'Essa dica é sobre mim mesmo!'
          ]) : null,
          hintId: hint.id,
          createdAt: faker.date.recent({ days: 10 }),
          answeredAt: faker.datatype.boolean(0.6) ? faker.date.recent({ days: 5 }) : null
        }
      });
      interactionsCount++;
    }
  }
  
  console.log(`✅ ${interactionsCount} interações criadas`);
}

// Função para criar logs de auditoria
async function createAuditLogs(users) {
  console.log('📋 Criando logs de auditoria...');
  
  const actions = [
    'user_login',
    'user_register',
    'password_change',
    'message_sent',
    'hint_viewed',
    'interaction_created',
    'validation_attempt'
  ];
  
  let logsCount = 0;
  
  for (let i = 0; i < 50; i++) {
    const user = faker.helpers.arrayElement(users);
    const action = faker.helpers.arrayElement(actions);
    
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action,
        details: JSON.stringify({
          ip: faker.internet.ip(),
          userAgent: faker.internet.userAgent(),
          timestamp: new Date().toISOString()
        }),
        ipAddress: faker.internet.ip(),
        userAgent: faker.internet.userAgent(),
        createdAt: faker.date.recent({ days: 30 })
      }
    });
    logsCount++;
  }
  
  console.log(`✅ ${logsCount} logs de auditoria criados`);
}

// Função principal de seed
async function main() {
  console.log('🌱 Iniciando seed do banco de dados...');
  console.log('=' .repeat(50));
  
  try {
    // Limpar dados existentes
    console.log('🧹 Limpando dados existentes...');
    await prisma.auditLog.deleteMany();
    await prisma.userSession.deleteMany();
    await prisma.rateLimit.deleteMany();
    await prisma.reply.deleteMany();
    await prisma.message.deleteMany();
    await prisma.interaction.deleteMany();
    await prisma.hint.deleteMany();
    await prisma.admirer.deleteMany();
    await prisma.user.deleteMany();
    
    // Criar dados de teste
    const users = await createTestUsers();
    await createAdmirersAndHints(users);
    await createMessages(users);
    await createInteractions();
    await createAuditLogs(users);
    
    console.log('\n🎉 Seed concluído com sucesso!');
    console.log('\n📊 Resumo dos dados criados:');
    
    const stats = {
      users: await prisma.user.count(),
      admirers: await prisma.admirer.count(),
      hints: await prisma.hint.count(),
      interactions: await prisma.interaction.count(),
      messages: await prisma.message.count(),
      replies: await prisma.reply.count(),
      auditLogs: await prisma.auditLog.count()
    };
    
    Object.entries(stats).forEach(([key, value]) => {
      console.log(`   ${key}: ${value}`);
    });
    
    console.log('\n🔑 Credenciais de teste:');
    console.log('   Admin: admin@enigmacrush.com / admin123');
    console.log('   Usuários: qualquer email criado / 123456');
    
  } catch (error) {
    console.error('❌ Erro durante o seed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Executar apenas se chamado diretamente
if (require.main === module) {
  main()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}

module.exports = main;