import { defineConfig } from '@prisma/config';

export default defineConfig({
  schema: '/prisma/schema.prisma',
  datasources: {
    db: {
      url: 'postgresql://postgres:MolMFmfoGWOlscatueDqpDHSxsBNmFJb@postgres.railway.internal:5432/railway',
    },
  },
});
