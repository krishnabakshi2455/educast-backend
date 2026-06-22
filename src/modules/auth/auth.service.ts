import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getEnv } from '../../config/env';
import { UnauthorizedError, NotFoundError } from '../../utils/errors';
import {
  CreateSchoolAndRegisterDto,
  PrincipalLoginDto,
  TeacherLoginDto,
  StudentLoginDto,
} from './auth.schema';
import { JwtPayload } from '../../middlewares/auth';
import { userRepo } from '../../repositories/user.repo';
import { schoolRepo } from '../../repositories/school.repo';
import { classRepo } from '../../repositories/class.repo';
import { refreshTokenRepo } from '../../repositories/refreshToken.repo';
import { generateSchoolCode } from '../../utils/schoolCode';

function generateTokens(payload: JwtPayload): { accessToken: string; refreshToken: string } {
  const env = getEnv();
  const accessToken = jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN } as jwt.SignOptions);
  const refreshToken = jwt.sign(payload, env.JWT_REFRESH_SECRET, { expiresIn: env.JWT_REFRESH_EXPIRES_IN } as jwt.SignOptions);
  return { accessToken, refreshToken };
}

function refreshTokenExpiry(): Date {
  return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
}

async function issueTokensFor(user: { id: string; email: string; role: string; schoolId: string }) {
  const payload: JwtPayload = {
    userId: user.id,
    email: user.email,
    role: user.role as JwtPayload['role'],
    schoolId: user.schoolId,
  };
  const { accessToken, refreshToken } = generateTokens(payload);
  await refreshTokenRepo.create(refreshToken, user.id, refreshTokenExpiry());
  return { accessToken, refreshToken };
}

/**
 * Principal creates a brand new school. No schoolCode is needed for this —
 * one is generated and returned so the Principal can use it for all future
 * logins (and to give to teachers/students).
 */
export async function createSchoolAndRegister(dto: CreateSchoolAndRegisterDto) {
  // Generate a unique school code, retrying on the rare collision
  let schoolCode = generateSchoolCode();
  for (let attempts = 0; attempts < 5; attempts++) {
    const existing = await schoolRepo.findByCodeExists(schoolCode);
    if (!existing) break;
    schoolCode = generateSchoolCode();
  }

  const passwordHash = await bcrypt.hash(dto.password, 12);

  const { school, user } = await schoolRepo.createSchoolWithPrincipal(
    {
      schoolCode,
      name: dto.schoolName,
      address: dto.schoolAddress,
      phone: dto.schoolPhone,
      email: dto.schoolEmail,
    },
    (schoolId: string) => ({
      name: dto.name,
      email: dto.email,
      passwordHash,
      role: 'PRINCIPAL',
      schoolId,
    })
  );

  const tokens = await issueTokensFor(user);

  return {
    ...tokens,
    user,
    school: { id: school.id, schoolCode: school.schoolCode, name: school.name },
  };
}

/**
 * Principal login — requires School ID + email + password.
 */
export async function loginPrincipal(dto: PrincipalLoginDto) {
  const school = await schoolRepo.findByCode(dto.schoolCode);
  if (!school) throw new NotFoundError('School not found for the given School ID');

  const user = await userRepo.findByEmailAndSchool(dto.email, school.id);
  if (!user || user.role !== 'PRINCIPAL') throw new UnauthorizedError('Invalid School ID, email or password');

  const valid = await bcrypt.compare(dto.password, user.passwordHash);
  if (!valid) throw new UnauthorizedError('Invalid School ID, email or password');

  const tokens = await issueTokensFor(user);
  const { passwordHash: _, ...safeUser } = user;
  return { ...tokens, user: safeUser, school: { id: school.id, schoolCode: school.schoolCode, name: school.name } };
}

/**
 * Teacher login — requires School ID + email + password.
 */
export async function loginTeacher(dto: TeacherLoginDto) {
  const school = await schoolRepo.findByCode(dto.schoolCode);
  if (!school) throw new NotFoundError('School not found for the given School ID');

  const user = await userRepo.findByEmailAndSchool(dto.email, school.id);
  if (!user || user.role !== 'TEACHER') throw new UnauthorizedError('Invalid School ID, email or password');

  const valid = await bcrypt.compare(dto.password, user.passwordHash);
  if (!valid) throw new UnauthorizedError('Invalid School ID, email or password');

  const tokens = await issueTokensFor(user);
  const { passwordHash: _, ...safeUser } = user;
  return { ...tokens, user: safeUser, school: { id: school.id, schoolCode: school.schoolCode, name: school.name } };
}

/**
 * Student login — requires School ID + email + password + class + section.
 * The class/section act as an additional verification layer: login fails if
 * they don't match the student's actual assignment.
 */
export async function loginStudent(dto: StudentLoginDto) {
  const school = await schoolRepo.findByCode(dto.schoolCode);
  if (!school) throw new NotFoundError('School not found for the given School ID');

  const user = await userRepo.findByEmailAndSchool(dto.email, school.id);
  if (!user || user.role !== 'STUDENT') throw new UnauthorizedError('Invalid School ID, email or password');

  const valid = await bcrypt.compare(dto.password, user.passwordHash);
  if (!valid) throw new UnauthorizedError('Invalid School ID, email or password');

  // Verify class + section match the student's actual assignment
  const studentClass = user.classId ? await classRepo.findById(user.classId) : null;

  if (
    !studentClass ||
    studentClass.classNumber !== dto.classNumber ||
    studentClass.section.toUpperCase() !== dto.section.toUpperCase()
  ) {
    throw new UnauthorizedError('Class and section do not match your assigned class');
  }

  const tokens = await issueTokensFor(user);
  const { passwordHash: _, ...safeUser } = user;
  return { ...tokens, user: safeUser, school: { id: school.id, schoolCode: school.schoolCode, name: school.name } };
}

export async function refreshTokens(token: string) {
  const env = getEnv();

  let payload: JwtPayload;
  try {
    payload = jwt.verify(token, env.JWT_REFRESH_SECRET) as JwtPayload;
  } catch {
    throw new UnauthorizedError('Invalid or expired refresh token');
  }

  const stored = await refreshTokenRepo.findByToken(token);
  if (!stored || stored.expiresAt < new Date()) {
    throw new UnauthorizedError('Refresh token expired or revoked');
  }

  await refreshTokenRepo.deleteByToken(token);

  const newPayload: JwtPayload = {
    userId: payload.userId,
    email: payload.email,
    role: payload.role,
    schoolId: payload.schoolId,
  };
  const tokens = generateTokens(newPayload);

  await refreshTokenRepo.create(tokens.refreshToken, payload.userId, refreshTokenExpiry());

  return tokens;
}

export async function logout(token: string) {
  await refreshTokenRepo.deleteManyByToken(token);
}
