import { z } from 'zod';

// Assign a teacher to a class-section WITH the subject they teach there
export const assignTeacherSchema = z.object({
  teacherId: z.string().uuid('Invalid teacher ID'),
  subject: z.string().min(1, 'Subject is required'),
});

export type AssignTeacherDto = z.infer<typeof assignTeacherSchema>;
