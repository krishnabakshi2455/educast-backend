import { prisma } from '../config/database';

const db = prisma as any;

export const schoolRepo = {
  create: (data: any) =>
    db.school.create({
      data,
      include: { _count: { select: { classes: true } } },
    }),

  findByCode: (schoolCode: string) =>
    db.school.findUnique({ where: { schoolCode } }),

  findByCodeExists: (schoolCode: string) =>
    db.school.findUnique({ where: { schoolCode }, select: { id: true } }),

  findByPrincipal: (principalId: string) =>
    db.school.findMany({
      where: { principalId },
      include: { _count: { select: { classes: true } } },
      orderBy: { createdAt: 'desc' },
    }),

  findById: (id: string) =>
    db.school.findUnique({ where: { id } }),

  findByIdFull: (id: string) =>
    db.school.findUnique({
      where: { id },
      include: {
        classes: {
          orderBy: [{ classNumber: 'asc' }, { section: 'asc' }],
          include: { _count: { select: { teacherAssignments: true, students: true } } },
        },
        _count: { select: { classes: true } },
      },
    }),

  update: (id: string, data: any) =>
    db.school.update({
      where: { id },
      data,
      include: { _count: { select: { classes: true } } },
    }),

  delete: (id: string) =>
    db.school.delete({ where: { id } }),

  findByPrincipalWithCounts: (principalId: string) =>
    db.school.findMany({
      where: { principalId },
      include: { _count: { select: { classes: true } } },
    }),

  /**
   * Creates a School and its Principal User together in a transaction.
   * School.principalId is a required FK to User, and User.schoolId is a
   * required FK to School — so a temporary placeholder principalId is used
   * to satisfy the constraint, then patched once the user exists.
   */
  createSchoolWithPrincipal: async (schoolData: any, principalData: (schoolId: string) => any) => {
    return db.$transaction(async (tx: any) => {
      const tempSchool = await tx.school.create({
        data: { ...schoolData, principalId: null },
      });

      const user = await tx.user.create({
        data: principalData(tempSchool.id),
        select: { id: true, name: true, email: true, role: true, schoolId: true, createdAt: true },
      });

      const school = await tx.school.update({
        where: { id: tempSchool.id },
        data: { principalId: user.id },
      });

      return { school, user };
    });
  },
};
