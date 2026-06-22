import { prisma } from '../config/database';

const db = prisma as any;

export const refreshTokenRepo = {
  create: (token: string, userId: string, expiresAt: Date) =>
    db.refreshToken.create({
      data: { token, userId, expiresAt },
    }),

  findByToken: (token: string) =>
    db.refreshToken.findUnique({ where: { token } }),

  deleteByToken: (token: string) =>
    db.refreshToken.delete({ where: { token } }),

  deleteManyByToken: (token: string) =>
    db.refreshToken.deleteMany({ where: { token } }),
};
