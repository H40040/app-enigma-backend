const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function createGabrielUser() {
  try {
    // Verificar se o usuário já existe
    const existingUser = await prisma.user.findUnique({
      where: { email: 'g@g.com' }
    });

    if (existingUser) {
      console.log('Usuário g@g.com já existe. Atualizando senha...');
      
      // Atualizar a senha para '123456'
      const hashedPassword = await bcrypt.hash('123456', 10);
      
      const updatedUser = await prisma.user.update({
        where: { email: 'g@g.com' },
        data: {
          password: hashedPassword
        }
      });
      
      console.log('Senha atualizada para o usuário:', updatedUser.email);
      console.log('Nova senha: 123456');
    } else {
      console.log('Criando usuário g@g.com...');
      
      const hashedPassword = await bcrypt.hash('123456', 10);
      
      const user = await prisma.user.create({
        data: {
          email: 'g@g.com',
          password: hashedPassword,
          name: 'Gabriel Haddad',
          birthdate: new Date('1990-01-01'),
          cpf: '12345678901',
          whatsapp: '11999999999'
        }
      });
      
      console.log('Usuário criado:', user);
      console.log('Email: g@g.com');
      console.log('Senha: 123456');
    }
  } catch (error) {
    console.error('Erro ao criar/atualizar usuário:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createGabrielUser();