import { z } from 'zod';

export const updateSchoolSchema = z.object({
  name: z.string().min(2).optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
});

// Class/section generation — Principal enters counts, system generates all combos
export const setupClassesSchema = z.object({
  numberOfClasses: z.coerce.number().int().min(1).max(12),
  numberOfSections: z.coerce.number().int().min(1).max(26),
});

// Adding a teacher to the school (Principal-only action)
export const addTeacherSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

// Adding a student to the school + assigning their class-section
export const addStudentSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  classId: z.string().uuid('Invalid class ID'),
});

export type UpdateSchoolDto = z.infer<typeof updateSchoolSchema>;
export type SetupClassesDto = z.infer<typeof setupClassesSchema>;
export type AddTeacherDto = z.infer<typeof addTeacherSchema>;
export type AddStudentDto = z.infer<typeof addStudentSchema>;
