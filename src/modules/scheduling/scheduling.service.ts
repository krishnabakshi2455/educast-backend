import { cacheGet, cacheSet, CacheKeys } from '../../config/redis';
import { contentRepo } from '../../repositories/content.repo';

export interface LiveContent {
  id: string;
  title: string;
  description: string | null;
  subject: string;
  fileUrl: string;
  fileType: string;
  mimeType: string;
  originalName: string;
  rotationDuration: number;
  startTime: Date | null;
  endTime: Date | null;
  uploader: { id: string; name: string };
  class: { id: string; name: string; subject: string } | null;
  currentSlotEndsAt: Date;
  positionInRotation: number;
  totalInRotation: number;
}

export async function getLiveContent(teacherId: string, subject?: string): Promise<LiveContent[]> {
  const cacheKey = CacheKeys.liveContent(teacherId, subject ?? 'all');
  const cached = await cacheGet(cacheKey);
  if (cached) {
    try { return JSON.parse(cached); } catch { /* ignore */ }
  }

  const now = new Date();
  const content = await contentRepo.findApprovedByTeacher(teacherId, subject, now);

  if (content.length === 0) return [];

  // Group by subject
  const bySubject = new Map<string, typeof content>();
  for (const item of content) {
    const key = (item.subject as string).toLowerCase();
    if (!bySubject.has(key)) bySubject.set(key, []);
    bySubject.get(key)!.push(item);
  }

  const results: LiveContent[] = [];

  for (const [, items] of bySubject) {
    if (items.length === 0) continue;

    const totalCycleMs = items.reduce((sum: number, i: any) => sum + i.rotationDuration * 60_000, 0);
    const elapsedMs = now.getTime() % totalCycleMs;

    let accumulated = 0;
    let activeItem = items[0];
    let activeIndex = 0;
    let slotStartMs = 0;

    for (let i = 0; i < items.length; i++) {
      const slotMs = items[i].rotationDuration * 60_000;
      if (elapsedMs >= accumulated && elapsedMs < accumulated + slotMs) {
        activeItem = items[i];
        activeIndex = i;
        slotStartMs = accumulated;
        break;
      }
      accumulated += slotMs;
    }

    const slotMs = activeItem.rotationDuration * 60_000;
    const timeIntoSlotMs = elapsedMs - slotStartMs;
    const remainingMs = slotMs - timeIntoSlotMs;

    results.push({
      id: activeItem.id,
      title: activeItem.title,
      description: activeItem.description,
      subject: activeItem.subject,
      fileUrl: activeItem.fileUrl,
      fileType: activeItem.fileType,
      mimeType: activeItem.mimeType,
      originalName: activeItem.originalName,
      rotationDuration: activeItem.rotationDuration,
      startTime: activeItem.startTime,
      endTime: activeItem.endTime,
      uploader: activeItem.uploader,
      class: activeItem.class,
      currentSlotEndsAt: new Date(now.getTime() + remainingMs),
      positionInRotation: activeIndex + 1,
      totalInRotation: items.length,
    });
  }

  await cacheSet(cacheKey, JSON.stringify(results), 30);
  return results;
}

export async function getRotationSchedule(teacherId: string, subject?: string) {
  const now = new Date();
  const content = await contentRepo.findApprovedByTeacher(teacherId, subject, now);

  const bySubject = new Map<string, typeof content>();
  for (const item of content) {
    const key = (item.subject as string).toLowerCase();
    if (!bySubject.has(key)) bySubject.set(key, []);
    bySubject.get(key)!.push(item);
  }

  const schedule: Record<string, unknown> = {};
  for (const [subj, items] of bySubject) {
    const totalCycleMinutes = items.reduce((sum: number, i: any) => sum + i.rotationDuration, 0);
    schedule[subj] = {
      cycleDurationMinutes: totalCycleMinutes,
      items: items.map((item: any, idx: number) => ({
        position: idx + 1,
        id: item.id,
        title: item.title,
        rotationDuration: item.rotationDuration,
        subject: item.subject,
        startTime: item.startTime,
        endTime: item.endTime,
      })),
    };
  }

  return schedule;
}
