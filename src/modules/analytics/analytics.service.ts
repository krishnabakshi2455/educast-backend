import { cacheGet, cacheSet, CacheKeys } from '../../config/redis';
import { schoolRepo } from '../../repositories/school.repo';
import { userRepo } from '../../repositories/user.repo';
import { contentRepo } from '../../repositories/content.repo';
import { classRepo } from '../../repositories/class.repo';

export async function getPrincipalStats(principalId: string, schoolId: string) {
  const cacheKey = CacheKeys.analytics(`principal:${schoolId}`);
  const cached = await cacheGet(cacheKey);
  if (cached) return JSON.parse(cached);

  const [
    schools,
    totalTeachers,
    totalStudents,
    totalClasses,
    pendingContent,
    approvedContent,
    rejectedContent,
    totalContent,
    recentPendingContent,
  ] = await Promise.all([
    schoolRepo.findByPrincipalWithCounts(principalId),
    userRepo.findByRoleAndSchool(schoolId, 'TEACHER').then((r: any[]) => r.length),
    userRepo.findByRoleAndSchool(schoolId, 'STUDENT').then((r: any[]) => r.length),
    classRepo.countBySchool(schoolId),
    contentRepo.countByStatusAndSchool(schoolId, 'PENDING'),
    contentRepo.countByStatusAndSchool(schoolId, 'APPROVED'),
    contentRepo.countByStatusAndSchool(schoolId, 'REJECTED'),
    contentRepo.countTotalBySchool(schoolId),
    contentRepo.findRecentPendingBySchool(schoolId, 5),
  ]);

  const stats = {
    schools: schools.length,
    totalClasses,
    totalTeachers,
    totalStudents,
    content: {
      total: totalContent,
      pending: pendingContent,
      approved: approvedContent,
      rejected: rejectedContent,
    },
    recentPendingContent,
  };

  await cacheSet(cacheKey, JSON.stringify(stats), 60);
  return stats;
}

export async function getTeacherStats(teacherId: string) {
  const cacheKey = CacheKeys.analytics(`teacher:${teacherId}`);
  const cached = await cacheGet(cacheKey);
  if (cached) return JSON.parse(cached);

  const [
    assignedClasses,
    pending,
    approved,
    rejected,
    total,
    bySubject,
    byFileType,
  ] = await Promise.all([
    classRepo.countTeacherClasses(teacherId),
    contentRepo.countByTeacher(teacherId, { status: 'PENDING' }),
    contentRepo.countByTeacher(teacherId, { status: 'APPROVED' }),
    contentRepo.countByTeacher(teacherId, { status: 'REJECTED' }),
    contentRepo.countByTeacher(teacherId, {}),
    contentRepo.groupBySubject(teacherId),
    contentRepo.groupByFileType(teacherId),
  ]);

  const stats = {
    assignedClasses,
    content: { total, pending, approved, rejected },
    bySubject: bySubject.map((s: any) => ({ subject: s.subject, count: s._count.id })),
    byFileType: byFileType.map((f: any) => ({ fileType: f.fileType, count: f._count.id })),
  };

  await cacheSet(cacheKey, JSON.stringify(stats), 60);
  return stats;
}

export async function getStudentStats(studentId: string) {
  const cacheKey = CacheKeys.analytics(`student:${studentId}`);
  const cached = await cacheGet(cacheKey);
  if (cached) return JSON.parse(cached);

  const student = await userRepo.findById(studentId);
  const classId = student?.classId;

  if (!classId) {
    const stats = { assignedClass: null, availableContent: 0, recentContent: [] };
    await cacheSet(cacheKey, JSON.stringify(stats), 60);
    return stats;
  }

  const [classes, availableContent, recentContent] = await Promise.all([
    classRepo.findByIds([classId]),
    contentRepo.countByClassId(classId),
    contentRepo.findRecentByClassId(classId, 5),
  ]);

  const stats = {
    assignedClass: classes[0] ?? null,
    availableContent,
    recentContent,
  };

  await cacheSet(cacheKey, JSON.stringify(stats), 60);
  return stats;
}

export async function getSubjectAnalytics(schoolId: string) {
  const cacheKey = CacheKeys.analytics(`subjects:${schoolId}`);
  const cached = await cacheGet(cacheKey);
  if (cached) return JSON.parse(cached);

  const subjectStats = await contentRepo.groupBySubjectAndStatusBySchool(schoolId);

  const bySubject: Record<string, Record<string, number>> = {};
  for (const row of subjectStats) {
    if (!bySubject[row.subject]) bySubject[row.subject] = {};
    bySubject[row.subject][row.status] = row._count.id;
  }

  const result = Object.entries(bySubject)
    .map(([subject, counts]) => ({
      subject,
      total: Object.values(counts).reduce((a: number, b: number) => a + b, 0),
      ...counts,
    }))
    .sort((a, b) => b.total - a.total);

  await cacheSet(cacheKey, JSON.stringify(result), 120);
  return result;
}
