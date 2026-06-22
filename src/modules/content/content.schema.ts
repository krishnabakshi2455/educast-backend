import { z } from 'zod';

export const uploadContentSchema = z.object({
  title: z.string().min(2, 'Title must be at least 2 characters'),
  description: z.string().optional(),
  subject: z.string().min(1, 'Subject is required'),
  classId: z.string().uuid('Invalid class ID').optional(),
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime().optional(),
  rotationDuration: z.string().transform(Number).pipe(z.number().min(1).max(120)).optional(),
}).refine(
  (data) => {
    if (data.startTime && data.endTime) {
      return new Date(data.startTime) < new Date(data.endTime);
    }
    return true;
  },
  { message: 'startTime must be before endTime', path: ['startTime'] }
);

export const contentQuerySchema = z.object({
  status: z.enum(['UPLOADED', 'PENDING', 'APPROVED', 'REJECTED']).optional(),
  subject: z.string().optional(),
  classId: z.string().uuid().optional(),
  fileType: z.enum(['IMAGE', 'PDF', 'VIDEO', 'DOCUMENT']).optional(),
  page: z.string().default('1').transform(Number),
  limit: z.string().default('20').transform(Number),
});

export type UploadContentDto = z.infer<typeof uploadContentSchema>;
