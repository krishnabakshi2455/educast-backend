import { Request, Response, NextFunction } from 'express';
import * as usersService from './users.service';
import { sendSuccess } from '../../utils/response';

function qs(val: string | string[] | undefined): string | undefined {
  return Array.isArray(val) ? val[0] : val;
}

export async function getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await usersService.getMe(req.user!.userId);
    sendSuccess(res, user);
  } catch (err) { next(err); }
}

export async function getAllUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const role = qs(req.query.role as string | string[]);
    const users = await usersService.getAllUsers(req.user!.schoolId, role);
    sendSuccess(res, users);
  } catch (err) { next(err); }
}

export async function getUserById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await usersService.getUserById(req.params.id, req.user!.schoolId);
    sendSuccess(res, user);
  } catch (err) { next(err); }
}
