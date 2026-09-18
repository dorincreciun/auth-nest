import 'dotenv/config';
import { defineConfig } from 'prisma/config';

/**
 * Schema și migrările stau lângă modulul care le folosește, nu în `prisma/` la rădăcină.
 *
 * De la Prisma 7, URL-ul bazei de date pentru CLI se declară aici, nu în schema;
 * aplicația își construiește propria conexiune prin adapter (vezi `PrismaService`).
 */
export default defineConfig({
  schema: 'src/modules/prisma/schema.prisma',
  migrations: {
    path: 'src/modules/prisma/migrations',
  },
  datasource: {
    url: process.env['DATABASE_URL'],
  },
});
