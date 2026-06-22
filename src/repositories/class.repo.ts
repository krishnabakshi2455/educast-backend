import { prisma } from '../config/database';

const db = prisma as any;

export const classRepo = {
  // ── School queries ────────────────────────────────────────────────────────
  findSchoolById: (id: string) =>
    db.school.findUnique({ where: { id } }),

  // ── Class queries ─────────────────────────────────────────────────────────
  findByIdWithSchool: (id: string) =>
    db.class.findUnique({
      where: { id },
      include: { school: true },
    }),

  findByIdFull: (id: string) =>
    db.class.findUnique({
      where: { id },
      include: {
        school: { select: { id: true, name: true, schoolCode: true } },
        teacherAssignments: {
          include: { teacher: { select: { id: true, name: true, email: true } } },
        },
        students: { select: { id: true, name: true, email: true } },
        _count: { select: { content: true } },
      },
    }),

  findBySchool: (schoolId: string) =>
    db.class.findMany({
      where: { schoolId },
      include: {
        teacherAssignments: {
          include: { teacher: { select: { id: true, name: true, email: true } } },
        },
        _count: { select: { students: true, content: true } },
      },
      orderBy: [{ classNumber: 'asc' }, { section: 'asc' }],
    }),

  findOne: (schoolId: string, classNumber: number, section: string) =>
    db.class.findUnique({
      where: { classNumber_section_schoolId: { classNumber, section, schoolId } },
    }),

  findById: (id: string) =>
    db.class.findUnique({ where: { id } }),

  create: (data: any) =>
    db.class.create({ data }),

  createMany: (data: any[]) =>
    db.class.createMany({ data, skipDuplicates: true }),

  delete: (id: string) =>
    db.class.delete({ where: { id } }),

  deleteBySchool: (schoolId: string) =>
    db.class.deleteMany({ where: { schoolId } }),

  countBySchool: (schoolId: string) =>
    db.class.count({ where: { schoolId } }),

  findByIds: (ids: string[]) =>
    db.class.findMany({
      where: { id: { in: ids } },
      include: {
        school: { select: { id: true, name: true, schoolCode: true } },
        teacherAssignments: {
          include: { teacher: { select: { id: true, name: true } } },
        },
      },
    }),

  // ── User query ────────────────────────────────────────────────────────────
  findUserById: (id: string) =>
    db.user.findUnique({ where: { id } }),

  // ── Teacher assignment queries (now includes subject) ─────────────────────
  findTeacherAssignment: (classId: string, teacherId: string, subject: string) =>
    db.classAssignment.findUnique({
      where: { classId_teacherId_subject: { classId, teacherId, subject } },
    }),

  createTeacherAssignment: (classId: string, teacherId: string, subject: string) =>
    db.classAssignment.create({
      data: { classId, teacherId, subject },
      include: {
        class: { select: { id: true, classNumber: true, section: true } },
        teacher: { select: { id: true, name: true, email: true } },
      },
    }),

  deleteTeacherAssignment: (assignmentId: string) =>
    db.classAssignment.delete({ where: { id: assignmentId } }),

  findAssignmentById: (assignmentId: string) =>
    db.classAssignment.findUnique({ where: { id: assignmentId } }),

  findTeacherClasses: (teacherId: string) =>
    db.classAssignment.findMany({
      where: { teacherId },
      include: {
        class: {
          include: {
            school: { select: { id: true, name: true, schoolCode: true } },
            _count: { select: { students: true, content: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),

  countTeacherClasses: (teacherId: string) =>
    db.classAssignment.count({ where: { teacherId } }),

  // ── Student queries (Student.classId is now direct, not a join table) ─────
  assignStudentToClass: (studentId: string, classId: string) =>
    db.user.update({ where: { id: studentId }, data: { classId } }),

  removeStudentFromClass: (studentId: string) =>
    db.user.update({ where: { id: studentId }, data: { classId: null } }),

  findStudentClass: (studentId: string) =>
    db.user.findUnique({
      where: { id: studentId },
      select: {
        studentClass: {
          include: {
            school: { select: { id: true, name: true, schoolCode: true } },
            teacherAssignments: {
              include: { teacher: { select: { id: true, name: true } } },
            },
            _count: { select: { content: true } },
          },
        },
      },
    }),

  findStudentsByClass: (classId: string) =>
    db.user.findMany({
      where: { classId, role: 'STUDENT' },
      select: { id: true, name: true, email: true },
    }),
};
