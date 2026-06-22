import { userRepo } from '../../repositories/user.repo';
import { NotFoundError } from '../../utils/errors';

export async function getMe(userId: string) {
  const user = await userRepo.findByIdSafe(userId);
  if (!user) throw new NotFoundError('User not found');
  return user;
}

// Scoped to the requester's own school — prevents cross-school data leaks
export async function getAllUsers(schoolId: string, role?: string) {
  return userRepo.findAllBySchool(schoolId, role);
}

export async function getUserById(id: string, schoolId: string) {
  const user = await userRepo.findByIdAndSchool(id, schoolId);
  if (!user) throw new NotFoundError('User not found');
  const { passwordHash: _, ...safeUser } = user;
  return safeUser;
}
