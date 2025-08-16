// Seed script for Prisma SQLite DB
// Run with: npx tsx prisma/seed.ts

import { PrismaClient } from '@prisma/client';
import { faker } from '@faker-js/faker';

const prisma = new PrismaClient();

async function main() {
  // Quantidade de dados
  const userCount = 10;
  const admirerCount = 6;
  const hintsPerAdmirer = 2;
  const interactionsPerHint = 2;
  const messagesCount = 10;
  const repliesPerMessage = 1;

  // Usuários
  type UserType = Awaited<ReturnType<typeof prisma.user.create>>;
  const users: UserType[] = [];
  for (let i = 0; i < userCount; i++) {
    users.push(
      await prisma.user.create({
        data: {
          name: faker.person.fullName(),
          email: faker.internet.email(),
          password: faker.internet.password(),
          birthdate: faker.date.birthdate({ min: 18, max: 40, mode: 'age' }),
          cpf: faker.string.numeric(11),
          isAdmin: i === 0, // só o primeiro é admin
          lastLogin: faker.date.recent(),
        },
      })
    );
  }

  // Admirers
  type AdmirerType = Awaited<ReturnType<typeof prisma.admirer.create>>;
  const admirers: AdmirerType[] = [];
  for (let i = 0; i < admirerCount; i++) {
    admirers.push(
      await prisma.admirer.create({
        data: {
          userId: users[i % users.length].id,
        },
      })
    );
  }

  // Hints e Interactions
  type HintType = Awaited<ReturnType<typeof prisma.hint.create>>;
  for (const admirer of admirers) {
    for (let i = 0; i < hintsPerAdmirer; i++) {
      const hint: HintType = await prisma.hint.create({
        data: {
          content: faker.lorem.sentence(),
          type: 'text',
          admirerId: admirer.id,
          views: faker.number.int({ min: 0, max: 10 }),
          interactions: interactionsPerHint,
        },
      });
      for (let j = 0; j < interactionsPerHint; j++) {
        await prisma.interaction.create({
          data: {
            content: faker.lorem.sentence(),
            answer: faker.lorem.word(),
            hintId: hint.id,
            answeredAt: faker.date.recent(),
          },
        });
      }
    }
  }

  // Mensagens
  type MessageType = Awaited<ReturnType<typeof prisma.message.create>>;
  const messages: MessageType[] = [];
  for (let i = 0; i < messagesCount; i++) {
    const sender = users[faker.number.int({ min: 0, max: users.length - 1 })];
    const recipient = users.filter((u) => u.id !== sender.id)[
      faker.number.int({ min: 0, max: users.length - 2 })
    ];
    const contactMethod = faker.helpers.arrayElement([
      'platform',
      'email',
      'whatsapp',
    ] as const);
    messages.push(
      await prisma.message.create({
        data: {
          senderId: sender.id,
          recipientId:
            contactMethod === 'platform' ? recipient.id : undefined,
          recipientUsername:
            contactMethod === 'platform' ? recipient.name : undefined,
          recipientEmail:
            contactMethod === 'email' ? recipient.email : undefined,
          recipientPhone:
            contactMethod === 'whatsapp' ? faker.phone.number() : undefined,
          contactMethod,
          content: faker.lorem.paragraph(),
          imageUrl: faker.datatype.boolean()
            ? faker.image.url()
            : null,
          isRead: faker.datatype.boolean(),
          views: faker.number.int({ min: 0, max: 10 }),
        },
      })
    );
  }

  // Replies
  for (const msg of messages) {
    for (let i = 0; i < repliesPerMessage; i++) {
      await prisma.reply.create({
        data: {
          messageId: msg.id,
          content: faker.lorem.sentence(),
          fromRecipient: faker.datatype.boolean(),
        },
      });
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
