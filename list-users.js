const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function listUsers() {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        cpf: true,
        createdAt: true
      }
    });
    
    console.log('Usuários no banco de dados:');
    console.log(JSON.stringify(users, null, 2));
  } catch (error) {
    console.error('Erro ao listar usuários:', error);
  } finally {
    await prisma.$disconnect();
  }
}

listUsers();