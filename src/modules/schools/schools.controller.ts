import { Request, Response, NextFunction } from 'express';
import * as schoolsService from './schools.service';
import {
  updateSchoolSchema,
  setupClassesSchema,
  addTeacherSchema,
  addStudentSchema,
} from './schools.schema';
import { sendSuccess, sendCreated } from '../../utils/response';

export async function getSchools(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const schools = await schoolsService.getSchools(req.user!.userId);
    sendSuccess(res, schools);
  } catch (err) { next(err); }
}

export async function getSchoolById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const school = await schoolsService.getSchoolById(req.params.id, req.user!.userId);
    sendSuccess(res, school);
  } catch (err) { next(err); }
}

export async function updateSchool(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const dto = updateSchoolSchema.parse(req.body);
    const school = await schoolsService.updateSchool(req.params.id, req.user!.userId, dto);
    sendSuccess(res, school, 'School updated successfully');
  } catch (err) { next(err); }
}

export async function deleteSchool(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await schoolsService.deleteSchool(req.params.id, req.user!.userId);
    sendSuccess(res, null, 'School deleted successfully');
  } catch (err) { next(err); }
}

export async function setupClasses(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const dto = setupClassesSchema.parse(req.body);
    const classes = await schoolsService.setupClasses(req.params.id, req.user!.userId, dto);
    sendCreated(res, classes, 'Classes and sections generated successfully');
  } catch (err) { next(err); }
}

export async function getClasses(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const classes = await schoolsService.getClasses(req.params.id, req.user!.userId);
    sendSuccess(res, classes);
  } catch (err) { next(err); }
}

export async function addTeacher(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const dto = addTeacherSchema.parse(req.body);
    const teacher = await schoolsService.addTeacher(req.params.id, req.user!.userId, dto);
    sendCreated(res, teacher, 'Teacher added successfully');
  } catch (err) { next(err); }
}

export async function getTeachers(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const teachers = await schoolsService.getTeachers(req.params.id, req.user!.userId);
    sendSuccess(res, teachers);
  } catch (err) { next(err); }
}

export async function addStudent(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const dto = addStudentSchema.parse(req.body);
    const student = await schoolsService.addStudent(req.params.id, req.user!.userId, dto);
    sendCreated(res, student, 'Student added successfully');
  } catch (err) { next(err); }
}

export async function getStudents(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const students = await schoolsService.getStudents(req.params.id, req.user!.userId);
    sendSuccess(res, students);
  } catch (err) { next(err); }
}
