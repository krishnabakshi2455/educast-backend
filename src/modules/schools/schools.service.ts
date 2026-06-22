import bcrypt from 'bcryptjs';
import { schoolRepo } from '../../repositories/school.repo';
import { classRepo } from '../../repositories/class.repo';
import { userRepo } from '../../repositories/user.repo';
import { NotFoundError, ForbiddenError, BadRequestError, ConflictError } from '../../utils/errors';
import { UpdateSchoolDto, SetupClassesDto, AddTeacherDto, AddStudentDto } from './schools.schema';

async function verifyOwnership(schoolId: string, principalId: string) {
  const school = await schoolRepo.findById(schoolId);
  if (!school) throw new NotFoundError('School not found');
  if (school.principalId !== principalId) throw new ForbiddenError('Access denied');
  return school;
}

export async function getSchools(principalId: string) {
  return schoolRepo.findByPrincipal(principalId);
}

export async function getSchoolById(id: string, principalId: string) {
  await verifyOwnership(id, principalId);
  return schoolRepo.findByIdFull(id);
}

export async function updateSchool(id: string, principalId: string, dto: UpdateSchoolDto) {
  await verifyOwnership(id, principalId);
  return schoolRepo.update(id, dto);
}

export async function deleteSchool(id: string, principalId: string) {
  await verifyOwnership(id, principalId);
  await schoolRepo.delete(id);
}

/**
 * Generates every class-section combination for a school.
 * e.g. numberOfClasses=6, numberOfSections=4 ->
 *   1-A, 1-B, 1-C, 1-D, 2-A...6-D  (24 rows)
 * Skips combinations that already exist (idempotent — safe to call again
 * later if the Principal wants to add more classes/sections).
 */
export async function setupClasses(schoolId: string, principalId: string, dto: SetupClassesDto) {
  await verifyOwnership(schoolId, principalId);

  const sectionLetters = Array.from({ length: dto.numberOfSections }, (_, i) =>
    String.fromCharCode(65 + i) // 65 = 'A'
  );

  const rows: { classNumber: number; section: string; schoolId: string }[] = [];
  for (let classNumber = 1; classNumber <= dto.numberOfClasses; classNumber++) {
    for (const section of sectionLetters) {
      rows.push({ classNumber, section, schoolId });
    }
  }

  await classRepo.createMany(rows);
  return classRepo.findBySchool(schoolId);
}

export async function getClasses(schoolId: string, principalId: string) {
  await verifyOwnership(schoolId, principalId);
  return classRepo.findBySchool(schoolId);
}

/**
 * Principal adds a new teacher account, scoped to this school.
 */
export async function addTeacher(schoolId: string, principalId: string, dto: AddTeacherDto) {
  await verifyOwnership(schoolId, principalId);

  const existing = await userRepo.findByEmailAndSchool(dto.email, schoolId);
  if (existing) throw new ConflictError('A user with this email already exists in this school');

  const passwordHash = await bcrypt.hash(dto.password, 12);
  return userRepo.create({
    name: dto.name,
    email: dto.email,
    passwordHash,
    role: 'TEACHER',
    schoolId,
  });
}

export async function getTeachers(schoolId: string, principalId: string) {
  await verifyOwnership(schoolId, principalId);
  return userRepo.findByRoleAndSchool(schoolId, 'TEACHER');
}

/**
 * Principal adds a new student account, scoped to this school, and assigns
 * them directly to a class-section.
 */
export async function addStudent(schoolId: string, principalId: string, dto: AddStudentDto) {
  await verifyOwnership(schoolId, principalId);

  const existing = await userRepo.findByEmailAndSchool(dto.email, schoolId);
  if (existing) throw new ConflictError('A user with this email already exists in this school');

  const cls = await classRepo.findByIdWithSchool(dto.classId);
  if (!cls) throw new NotFoundError('Class not found');
  if (cls.schoolId !== schoolId) throw new BadRequestError('Class does not belong to this school');

  const passwordHash = await bcrypt.hash(dto.password, 12);
  return userRepo.create({
    name: dto.name,
    email: dto.email,
    passwordHash,
    role: 'STUDENT',
    schoolId,
    classId: dto.classId,
  });
}

export async function getStudents(schoolId: string, principalId: string) {
  await verifyOwnership(schoolId, principalId);
  return userRepo.findByRoleAndSchool(schoolId, 'STUDENT');
}
