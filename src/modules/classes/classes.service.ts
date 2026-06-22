import { classRepo } from '../../repositories/class.repo';
import { NotFoundError, ForbiddenError, ConflictError, BadRequestError } from '../../utils/errors';
import { AssignTeacherDto } from './classes.schema';
import { cacheDelPattern } from '../../config/redis';

async function verifyClassAccess(classId: string, principalId: string) {
  const cls = await classRepo.findByIdWithSchool(classId);
  if (!cls) throw new NotFoundError('Class not found');
  if (cls.school.principalId !== principalId) throw new ForbiddenError('Access denied');
  return cls;
}

export async function getClassById(id: string, principalId: string) {
  await verifyClassAccess(id, principalId);
  return classRepo.findByIdFull(id);
}

/**
 * Assign a teacher to a class-section for a specific subject.
 * The same teacher can be assigned to the same class multiple times for
 * different subjects. The same class can have many teachers.
 */
export async function assignTeacher(classId: string, principalId: string, dto: AssignTeacherDto) {
  await verifyClassAccess(classId, principalId);

  const teacher = await classRepo.findUserById(dto.teacherId);
  if (!teacher || teacher.role !== 'TEACHER') throw new BadRequestError('User is not a teacher');

  const existing = await classRepo.findTeacherAssignment(classId, dto.teacherId, dto.subject);
  if (existing) throw new ConflictError('This teacher is already assigned to this class for this subject');

  const assignment = await classRepo.createTeacherAssignment(classId, dto.teacherId, dto.subject);
  await cacheDelPattern(`live:${dto.teacherId}:*`);
  return assignment;
}

export async function removeTeacherAssignment(assignmentId: string, principalId: string) {
  const assignment = await classRepo.findAssignmentById(assignmentId);
  if (!assignment) throw new NotFoundError('Assignment not found');

  await verifyClassAccess(assignment.classId, principalId);
  await classRepo.deleteTeacherAssignment(assignmentId);
  await cacheDelPattern(`live:${assignment.teacherId}:*`);
}

export async function getTeacherClasses(teacherId: string) {
  return classRepo.findTeacherClasses(teacherId);
}

export async function getStudentClass(studentId: string) {
  const result = await classRepo.findStudentClass(studentId);
  return result?.studentClass ?? null;
}
