import { PrismaClient } from '@prisma/client';

declare global {
  // eslint-disable-next-line no-var
  var __infraPrisma: PrismaClient | undefined;
}

export const prisma = globalThis.__infraPrisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalThis.__infraPrisma = prisma;
}
