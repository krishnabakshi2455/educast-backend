import { Request, Response, NextFunction } from 'express';
import * as authService from './auth.service';
import {
  createSchoolAndRegisterSchema,
  principalLoginSchema,
  teacherLoginSchema,
  studentLoginSchema,
  refreshTokenSchema,
} from './auth.schema';
import { sendSuccess, sendCreated } from '../../utils/response';

export async function createSchoolAndRegister(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const dto = createSchoolAndRegisterSchema.parse(req.body);
    const result = await authService.createSchoolAndRegister(dto);
    sendCreated(res, result, 'School created and Principal registered successfully');
  } catch (err) { next(err); }
}

export async function loginPrincipal(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const dto = principalLoginSchema.parse(req.body);
    const result = await authService.loginPrincipal(dto);
    sendSuccess(res, result, 'Login successful');
  } catch (err) { next(err); }
}

export async function loginTeacher(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const dto = teacherLoginSchema.parse(req.body);
    const result = await authService.loginTeacher(dto);
    sendSuccess(res, result, 'Login successful');
  } catch (err) { next(err); }
}

export async function loginStudent(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const dto = studentLoginSchema.parse(req.body);
    const result = await authService.loginStudent(dto);
    sendSuccess(res, result, 'Login successful');
  } catch (err) { next(err); }
}

export async function refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { refreshToken } = refreshTokenSchema.parse(req.body);
    const tokens = await authService.refreshTokens(refreshToken);
    sendSuccess(res, tokens, 'Tokens refreshed');
  } catch (err) { next(err); }
}

export async function logout(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { refreshToken } = refreshTokenSchema.parse(req.body);
    await authService.logout(refreshToken);
    sendSuccess(res, null, 'Logged out successfully');
  } catch (err) { next(err); }
}
