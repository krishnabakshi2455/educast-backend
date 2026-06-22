# EduCast — School Content Broadcasting & Management System

A backend for distributing educational content from teachers to students, with school-scoped multi-tenancy, principal-controlled approval workflows, class/section management, and a time-based content rotation engine.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 18+ |
| Framework | Express.js + TypeScript |
| Database | PostgreSQL (Neon recommended) |
| ORM | Prisma |
| Auth | JWT + Refresh Token Rotation |
| Caching | Redis (Upstash recommended) |
| File Storage | Local (dev) / Cloudflare R2 (production) |
| Validation | Zod |
| Logging | Winston |
| Package Manager | pnpm |

---

## Core Model — School-Scoped Multi-Tenancy

A **Principal can own multiple schools**. Each school has a unique, human-enterable **School ID** (e.g. `SCH-7F3K9A`) generated automatically when the school is created.

**Every user belongs to exactly one school.** The same email can exist in different schools as completely separate accounts — uniqueness is `(email, schoolId)`, not email alone.

### Onboarding flow

1. **Create a new school** — `POST /api/auth/schools/register` — Principal provides name, email, password, and school details. A School ID is generated and returned. No School ID is needed to create a school.
2. **Log back in to an existing school** — every subsequent login (for all three roles) requires the **School ID**.

### Hierarchy

```
School (unique School ID)
  └── Principal (owns the school)
        └── Classes (generated: classNumber 1–12 × Section A, B, C...)
              ├── ClassAssignment (Teacher + Subject, per class-section)
              └── Students (each has exactly one classId)
```

### Class & Section Generation

Classes are **fixed** (1 through 12). Sections are **dynamic** (A, B, C...). The Principal specifies counts once:

```
POST /api/schools/:id/classes/setup
{ "numberOfClasses": 6, "numberOfSections": 4 }
```

This generates all combinations: `1-A, 1-B, 1-C, 1-D, 2-A...6-D` (24 rows for this example). Safe to call again later to add more — existing combinations are skipped.

### Subject Lives on the Assignment, Not the Class

There is no `Subject` entity and no `subject` field on `Class`. A class-section (e.g. "1-A") is just a group of students. Subject is attached when a **teacher is assigned to a class**:

```
POST /api/classes/:id/teachers
{ "teacherId": "uuid", "subject": "Mathematics" }
```

The same class can have many teachers, each teaching a different subject. The same teacher can be assigned to many class-sections.

---

## Login — Role-Specific Endpoints

All three roles require the **School ID**. Students additionally confirm their **class number + section** as an extra verification layer.

| Role | Endpoint | Required fields |
|---|---|---|
| Principal | `POST /api/auth/login/principal` | schoolCode, email, password |
| Teacher | `POST /api/auth/login/teacher` | schoolCode, email, password |
| Student | `POST /api/auth/login/student` | schoolCode, email, password, classNumber, section |

Student login fails if the submitted classNumber/section don't match their actual assignment — even with a correct password.

---

## Setup

```bash
# Install
pnpm install

# Configure environment
cp .env.example .env

# Generate Prisma client
pnpm run prisma:generate

# Run migrations
pnpm run prisma:migrate:dev

# Seed test data
pnpm run prisma:seed

# Start development server
pnpm run dev
```

## Test Credentials (after seed)

**School ID: `SCH-DEMO01`** — required for every login below.

| Role | Email | Extra fields needed at login |
|---|---|---|
| Principal | principal@educast.com | — |
| Teacher | teacher.math@educast.com | — (assigned to Class 1-A, Mathematics) |
| Teacher | teacher.science@educast.com | — (assigned to Class 2-A, Science) |
| Student | student1@educast.com | classNumber: 1, section: A |
| Student | student2@educast.com | classNumber: 2, section: A |

All passwords: `Password123!`

---

## API Reference

### Base URL
```
http://localhost:3000/api
```
All protected routes require `Authorization: Bearer <accessToken>`.

---

### Auth

#### POST /auth/schools/register
Creates a brand-new school and its Principal account in one step. Returns a generated `schoolCode`.
```json
{
  "name": "Dr. Sarah Johnson",
  "email": "principal@educast.com",
  "password": "Password123!",
  "schoolName": "Delhi Public School",
  "schoolAddress": "123 Education Lane",
  "schoolPhone": "+91-11-12345678",
  "schoolEmail": "info@dps.edu.in"
}
```
Response includes `school.schoolCode` — save this, it's required for all future logins.

#### POST /auth/login/principal
```json
{ "schoolCode": "SCH-DEMO01", "email": "principal@educast.com", "password": "Password123!" }
```

#### POST /auth/login/teacher
```json
{ "schoolCode": "SCH-DEMO01", "email": "teacher.math@educast.com", "password": "Password123!" }
```

#### POST /auth/login/student
```json
{
  "schoolCode": "SCH-DEMO01",
  "email": "student1@educast.com",
  "password": "Password123!",
  "classNumber": 1,
  "section": "A"
}
```

#### POST /auth/refresh
```json
{ "refreshToken": "<token>" }
```

#### POST /auth/logout
```json
{ "refreshToken": "<token>" }
```

---

### Users

| Method | Endpoint | Role | Description |
|---|---|---|---|
| GET | /users/me | All | Get own profile |
| GET | /users | PRINCIPAL | List all users in own school (filter `?role=`) |
| GET | /users/:id | PRINCIPAL | Get user by ID (must belong to own school) |

---

### Schools

| Method | Endpoint | Description |
|---|---|---|
| GET | /schools | List own schools |
| GET | /schools/:id | Get school with all its classes |
| PUT | /schools/:id | Update school details |
| DELETE | /schools/:id | Delete school and all its classes |
| POST | /schools/:id/classes/setup | Generate class-section combinations |
| GET | /schools/:id/classes | List all classes for this school |
| POST | /schools/:id/teachers | Add a new teacher to this school |
| GET | /schools/:id/teachers | List all teachers in this school |
| POST | /schools/:id/students | Add a new student, assigned to a class |
| GET | /schools/:id/students | List all students in this school |

**Setup classes body:**
```json
{ "numberOfClasses": 6, "numberOfSections": 4 }
```

**Add teacher body:**
```json
{ "name": "Mr. Sharma", "email": "sharma@educast.com", "password": "Password123!" }
```

**Add student body:**
```json
{ "name": "Arjun Kumar", "email": "arjun@educast.com", "password": "Password123!", "classId": "<uuid>" }
```

---

### Classes

| Method | Endpoint | Role | Description |
|---|---|---|---|
| GET | /classes/my | TEACHER, STUDENT | Teacher: list of assignments. Student: their single class |
| GET | /classes/:id | PRINCIPAL | Class detail with teachers and students |
| POST | /classes/:id/teachers | PRINCIPAL | Assign a teacher + subject to this class |
| DELETE | /classes/assignments/:assignmentId | PRINCIPAL | Remove a teacher-subject assignment |

**Assign teacher body:**
```json
{ "teacherId": "<uuid>", "subject": "Mathematics" }
```

---

### Content

#### POST /content/upload (TEACHER)
Multipart form data — unchanged from before. `classId` is now a class-section ID. Teacher must hold an assignment (any subject) on that class to upload to it.

| Method | Endpoint | Role | Description |
|---|---|---|---|
| POST | /content/upload | TEACHER | Upload content |
| GET | /content/my | TEACHER | List own content |
| GET | /content | PRINCIPAL | List all content in own school |
| GET | /content/student/feed | STUDENT | Approved content for the student's single class |
| GET | /content/:id | PRINCIPAL, TEACHER | Get content by ID |
| DELETE | /content/:id | TEACHER | Delete own pending/rejected content |

---

### Approval (Principal only)

| Method | Endpoint | Description |
|---|---|---|
| GET | /approval/pending | Pending content queue, scoped to own school |
| PATCH | /approval/:id/approve | Approve content |
| PATCH | /approval/:id/reject | Reject content with reason |

---

### Live Content (Public — no auth required)

#### GET /content/live/:teacherId
Unchanged — returns the currently active rotated content for a teacher.

#### GET /content/schedule/:teacherId (PRINCIPAL, TEACHER)
View the full rotation schedule.

---

### Analytics

| Method | Endpoint | Role | Description |
|---|---|---|---|
| GET | /analytics/principal | PRINCIPAL | School-wide dashboard stats |
| GET | /analytics/teacher | TEACHER | Own upload stats |
| GET | /analytics/student | STUDENT | Own class + content stats |
| GET | /analytics/subjects | PRINCIPAL | Subject usage analytics, scoped to own school |

---

### Health Check

#### GET /health
```json
{ "status": "ok", "timestamp": "...", "version": "3.0.0" }
```

---

## Deployment

### Render / Koyeb (Backend)
1. Set all environment variables from `.env.example`
2. Build command: `pnpm run build`
3. Start command: `pnpm start`
4. Add `pnpm run prisma:migrate` as a pre-deploy step

### Docker (Alternative)
```bash
docker build -t educast-backend .
docker run --env-file .env -p 3000:3000 educast-backend
```
Neon and Upstash remain external managed services regardless of Docker use — only the Node.js app is containerized.

### Neon (Database)
Connection string with `?sslmode=require` in `DATABASE_URL`.

### Upstash (Redis)
TLS connection URL (`rediss://...`) in `REDIS_URL`. App runs without caching if left blank.

### Cloudflare R2 (File Storage)
Set `STORAGE_TYPE=s3` and fill in all `R2_*` variables for persistent file storage on ephemeral hosts like Render/Koyeb.

---

## Assumptions & Notes

- A Principal creating a second school goes through `/auth/schools/register` again with a new (or same) email — each school gets its own User row for that Principal.
- `(email, schoolId)` is the uniqueness key — the same email can be reused fresh at a different school once removed from the previous one.
- Students have a direct `classId` on their User row (not a join table) since each student belongs to exactly one class-section.
- A teacher can hold multiple `ClassAssignment` rows for the same class if teaching multiple subjects there, or across many different classes.
- Content upload to a class-section only requires the teacher to hold *any* subject assignment on that class — the `subject` field on the uploaded content itself is chosen freely by the teacher at upload time.
- All content, approval, and analytics queries are scoped to the requester's `schoolId` from their JWT — no cross-school data leakage.
