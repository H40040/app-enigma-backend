const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function checkUserPassword() {
  try {
    const user = await prisma.user.findUnique({
      where: { email: 'g@g.com' },
      select: {
        id: true,
        email: true,
        name: true,
        password: true
      }
    });

    if (user) {
      console.log('Usuário encontrado:');
      console.log('ID:', user.id);
      console.log('Email:', user.email);
      console.log('Nome:', user.name);
      console.log('Hash da senha:', user.password);
      
      // Testar algumas senhas comuns
      const testPasswords = ['123456', 'password', 'admin', 'g@g.com', 'gabriel'];
      
      for (const testPassword of testPasswords) {
        const isMatch = await bcrypt.compare(testPassword, user.password);
        console.log(`Senha '${testPassword}': ${isMatch ? 'CORRETA' : 'incorreta'}`);
      }
    } else {
      console.log('Usuário não encontrado');
    }
  } catch (error) {
    console.error('Erro:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUserPassword();