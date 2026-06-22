// @ts-ignore
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';

const prisma = new PrismaClient();

function generateSchoolCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = randomBytes(6);
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[bytes[i] % chars.length];
  return `SCH-${code}`;
}

async function main() {
  console.log('🌱 Seeding database...');

  const passwordHash = await bcrypt.hash('Password123!', 12);
  const schoolCode = 'SCH-DEMO01'; // fixed code for repeatable seed/demo

  // ── School + Principal (created together, like the real onboarding flow) ──
  const existingSchool = await prisma.school.findUnique({ where: { schoolCode } });

  let school, principal;

  if (existingSchool) {
    school = existingSchool;
    principal = await prisma.user.findUniqueOrThrow({
      where: { email_schoolId: { email: 'principal@educast.com', schoolId: school.id } },
    });
  } else {
    const result = await prisma.$transaction(async (tx: any) => {
      const tempSchool = await tx.school.create({
        data: {
          schoolCode,
          name: 'Delhi Public School',
          address: '123 Education Lane, New Delhi',
          phone: '+91-11-12345678',
          email: 'info@dps.edu.in',
          principalId: '00000000-0000-0000-0000-000000000000',
        },
      });

      const principalUser = await tx.user.create({
        data: {
          name: 'Dr. Sarah Johnson',
          email: 'principal@educast.com',
          passwordHash,
          role: 'PRINCIPAL',
          schoolId: tempSchool.id,
        },
      });

      const updatedSchool = await tx.school.update({
        where: { id: tempSchool.id },
        data: { principalId: principalUser.id },
      });

      return { school: updatedSchool, principal: principalUser };
    });
    school = result.school;
    principal = result.principal;
  }

  // ── Generate classes: 2 classes x 2 sections = 1-A, 1-B, 2-A, 2-B ──
  await prisma.class.createMany({
    data: [
      { classNumber: 1, section: 'A', schoolId: school.id },
      { classNumber: 1, section: 'B', schoolId: school.id },
      { classNumber: 2, section: 'A', schoolId: school.id },
      { classNumber: 2, section: 'B', schoolId: school.id },
    ],
    skipDuplicates: true,
  });

  const classes = await prisma.class.findMany({ where: { schoolId: school.id } });
  const class1A = classes.find((c: any) => c.classNumber === 1 && c.section === 'A')!;
  const class2A = classes.find((c: any) => c.classNumber === 2 && c.section === 'A')!;

  // ── Teachers ──
  const teacherMath = await prisma.user.upsert({
    where: { email_schoolId: { email: 'teacher.math@educast.com', schoolId: school.id } },
    update: {},
    create: {
      name: 'Mr. Rahul Sharma',
      email: 'teacher.math@educast.com',
      passwordHash,
      role: 'TEACHER',
      schoolId: school.id,
    },
  });

  const teacherScience = await prisma.user.upsert({
    where: { email_schoolId: { email: 'teacher.science@educast.com', schoolId: school.id } },
    update: {},
    create: {
      name: 'Ms. Priya Patel',
      email: 'teacher.science@educast.com',
      passwordHash,
      role: 'TEACHER',
      schoolId: school.id,
    },
  });

  // ── Teacher assignments (now carry subject) ──
  await prisma.classAssignment.upsert({
    where: { classId_teacherId_subject: { classId: class1A.id, teacherId: teacherMath.id, subject: 'Mathematics' } },
    update: {},
    create: { classId: class1A.id, teacherId: teacherMath.id, subject: 'Mathematics' },
  });

  await prisma.classAssignment.upsert({
    where: { classId_teacherId_subject: { classId: class2A.id, teacherId: teacherScience.id, subject: 'Science' } },
    update: {},
    create: { classId: class2A.id, teacherId: teacherScience.id, subject: 'Science' },
  });

  // ── Students (each has a single direct classId, no join table) ──
  const student1 = await prisma.user.upsert({
    where: { email_schoolId: { email: 'student1@educast.com', schoolId: school.id } },
    update: { classId: class1A.id },
    create: {
      name: 'Arjun Kumar',
      email: 'student1@educast.com',
      passwordHash,
      role: 'STUDENT',
      schoolId: school.id,
      classId: class1A.id,
    },
  });

  const student2 = await prisma.user.upsert({
    where: { email_schoolId: { email: 'student2@educast.com', schoolId: school.id } },
    update: { classId: class2A.id },
    create: {
      name: 'Neha Singh',
      email: 'student2@educast.com',
      passwordHash,
      role: 'STUDENT',
      schoolId: school.id,
      classId: class2A.id,
    },
  });

  console.log('✅ Seed complete!');
  console.log('\n📋 School ID (use this at login):', schoolCode);
  console.log('\n📋 Test Credentials (password: Password123!):');
  console.log(`  Principal : principal@educast.com`);
  console.log(`  Teacher   : teacher.math@educast.com     (assigned to Class 1-A, Mathematics)`);
  console.log(`  Teacher   : teacher.science@educast.com  (assigned to Class 2-A, Science)`);
  console.log(`  Student   : student1@educast.com  (Class 1, Section A)`);
  console.log(`  Student   : student2@educast.com  (Class 2, Section A)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
