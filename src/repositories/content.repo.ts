import { prisma } from '../config/database';

const db = prisma as any;

export const contentRepo = {
  create: (data: any) =>
    db.content.create({
      data,
      include: {
        uploader: { select: { id: true, name: true, email: true } },
        class: { select: { id: true, classNumber: true, section: true } },
      },
    }),

  findById: (id: string) =>
    db.content.findUnique({ where: { id } }),

  findByIdFull: (id: string) =>
    db.content.findUnique({
      where: { id },
      include: {
        uploader: { select: { id: true, name: true, email: true } },
        class: { select: { id: true, classNumber: true, section: true } },
        approver: { select: { id: true, name: true } },
      },
    }),

  findByTeacher: (teacherId: string, where: any, skip: number, take: number) =>
    db.content.findMany({
      where: { uploadedBy: teacherId, ...where },
      include: {
        class: { select: { id: true, classNumber: true, section: true } },
        approver: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    }),

  countByTeacher: (teacherId: string, where: any) =>
    db.content.count({ where: { uploadedBy: teacherId, ...where } }),

  findAllBySchool: (schoolId: string, where: any, skip: number, take: number) =>
    db.content.findMany({
      where: { ...where, uploader: { schoolId } },
      include: {
        uploader: { select: { id: true, name: true, email: true } },
        class: { select: { id: true, classNumber: true, section: true } },
        approver: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    }),

  countAllBySchool: (schoolId: string, where: any) =>
    db.content.count({ where: { ...where, uploader: { schoolId } } }),

  update: (id: string, data: any) =>
    db.content.update({
      where: { id },
      data,
      include: {
        uploader: { select: { id: true, name: true, email: true } },
        class: { select: { id: true, classNumber: true, section: true } },
      },
    }),

  delete: (id: string) =>
    db.content.delete({ where: { id } }),

  findApprovedByTeacher: (teacherId: string, subject: string | undefined, now: Date) =>
    db.content.findMany({
      where: {
        uploadedBy: teacherId,
        status: 'APPROVED',
        ...(subject ? { subject: { equals: subject, mode: 'insensitive' } } : {}),
        OR: [{ startTime: null }, { startTime: { lte: now } }],
        AND: [{ OR: [{ endTime: null }, { endTime: { gte: now } }] }],
      },
      include: {
        uploader: { select: { id: true, name: true } },
        class: { select: { id: true, classNumber: true, section: true } },
      },
      orderBy: { createdAt: 'asc' },
    }),

  findPendingBySchool: (schoolId: string, skip: number, take: number) =>
    db.content.findMany({
      where: { status: 'PENDING', uploader: { schoolId } },
      include: {
        uploader: { select: { id: true, name: true, email: true } },
        class: { select: { id: true, classNumber: true, section: true } },
      },
      orderBy: { createdAt: 'asc' },
      skip,
      take,
    }),

  countPendingBySchool: (schoolId: string) =>
    db.content.count({ where: { status: 'PENDING', uploader: { schoolId } } }),

  countByStatusAndSchool: (schoolId: string, status: string) =>
    db.content.count({ where: { status, uploader: { schoolId } } }),

  countTotalBySchool: (schoolId: string) =>
    db.content.count({ where: { uploader: { schoolId } } }),

  findRecentPendingBySchool: (schoolId: string, take: number) =>
    db.content.findMany({
      where: { status: 'PENDING', uploader: { schoolId } },
      include: { uploader: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
      take,
    }),

  findByClassId: (classId: string, where: any) =>
    db.content.findMany({
      where: { classId, status: 'APPROVED', ...where },
      include: {
        uploader: { select: { id: true, name: true } },
        class: { select: { id: true, classNumber: true, section: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),

  findRecentByClassId: (classId: string, take: number) =>
    db.content.findMany({
      where: { classId, status: 'APPROVED' },
      include: {
        uploader: { select: { id: true, name: true } },
        class: { select: { id: true, classNumber: true, section: true } },
      },
      orderBy: { createdAt: 'desc' },
      take,
    }),

  countByClassId: (classId: string) =>
    db.content.count({ where: { classId, status: 'APPROVED' } }),

  groupBySubject: (uploadedBy: string) =>
    db.content.groupBy({
      by: ['subject'],
      where: { uploadedBy },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
    }),

  groupByFileType: (uploadedBy: string) =>
    db.content.groupBy({
      by: ['fileType'],
      where: { uploadedBy },
      _count: { id: true },
    }),

  groupBySubjectAndStatusBySchool: (schoolId: string) =>
    db.content.groupBy({
      by: ['subject', 'status'],
      where: { uploader: { schoolId } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
    }),

  // A teacher may upload content for a class only if they hold ANY subject
  // assignment on that class (the subject of the content itself is chosen
  // by the teacher at upload time and need not match the assignment's subject
  // exactly, but they must be assigned to the class at all).
  findClassAssignmentForTeacher: (classId: string, teacherId: string) =>
    db.classAssignment.findFirst({
      where: { classId, teacherId },
    }),
};
