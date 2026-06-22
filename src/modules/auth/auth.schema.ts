import { z } from 'zod';

// ── Principal creates a brand new school (no schoolCode needed yet) ──────────
export const createSchoolAndRegisterSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  schoolName: z.string().min(2, 'School name must be at least 2 characters'),
  schoolAddress: z.string().optional(),
  schoolPhone: z.string().optional(),
  schoolEmail: z.string().email().optional(),
});

// ── Principal login to an existing/owned school ───────────────────────────────
export const principalLoginSchema = z.object({
  schoolCode: z.string().min(1, 'School ID is required'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

// ── Teacher / Student registration — created BY the Principal, not self-serve.
//    Included here for completeness; actual creation happens via the
//    schools/classes modules (addTeacher / addStudent), which call userRepo
//    directly. This schema documents the shape for that flow.
export const teacherLoginSchema = z.object({
  schoolCode: z.string().min(1, 'School ID is required'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const studentLoginSchema = z.object({
  schoolCode: z.string().min(1, 'School ID is required'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
  classNumber: z.coerce.number().int().min(1).max(12),
  section: z.string().min(1, 'Section is required'),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export type CreateSchoolAndRegisterDto = z.infer<typeof createSchoolAndRegisterSchema>;
export type PrincipalLoginDto = z.infer<typeof principalLoginSchema>;
export type TeacherLoginDto = z.infer<typeof teacherLoginSchema>;
export type StudentLoginDto = z.infer<typeof studentLoginSchema>;
