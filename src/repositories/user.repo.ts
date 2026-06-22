import { prisma } from '../config/database';

const db = prisma as any;

const safeSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  schoolId: true,
  classId: true,
  createdAt: true,
  updatedAt: true,
};

export const userRepo = {
  // Scoped lookup — used by login (schoolId + email together)
  findByEmailAndSchool: (email: string, schoolId: string) =>
    db.user.findUnique({ where: { email_schoolId: { email, schoolId } } }),

  findById: (id: string) =>
    db.user.findUnique({ where: { id } }),

  findByIdSafe: (id: string) =>
    db.user.findUnique({ where: { id }, select: safeSelect }),

  create: (data: any) =>
    db.user.create({
      data,
      select: { id: true, name: true, email: true, role: true, schoolId: true, classId: true, createdAt: true },
    }),

  findAllBySchool: (schoolId: string, role?: string) =>
    db.user.findMany({
      where: { schoolId, ...(role ? { role } : {}) },
      select: safeSelect,
      orderBy: { createdAt: 'desc' },
    }),

  findByRoleAndSchool: (schoolId: string, role: string) =>
    db.user.findMany({
      where: { schoolId, role },
      select: safeSelect,
      orderBy: { name: 'asc' },
    }),

  // Used for assignment validation (teacher/student must belong to the same school)
  findByIdAndSchool: (id: string, schoolId: string) =>
    db.user.findFirst({ where: { id, schoolId } }),
};
