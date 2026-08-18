# AcademyHub Database Layer (Prisma / PostgreSQL)

This directory contains the Prisma schema and initial database migrations for AcademyHub's transition to PostgreSQL as the primary system of record.

> **Phase 0 Status Note:**
> This database schema and initial migration represent Phase 0 of the system migration. The application currently continues to read and write via Firestore. No API routes, components, or services import `lib/prisma.ts` or query Postgres in Phase 0. Phase 1 (server-side authorization layer) and Phase 2 (route rewiring) will connect application logic directly to this database.

---

## Local Development & Migrations

### 1. Environment Configuration (`DATABASE_URL`)
Ensure `DATABASE_URL` is configured in your `.env` or `.env.local` file:

- **Local PostgreSQL (Direct TCP):**
  ```env
  DATABASE_URL="postgresql://postgres:postgres@localhost:5432/academyhub?schema=public"
  ```
- **Cloud SQL for Postgres (GCP `me-central1` via Cloud SQL Auth Proxy):**
  ```env
  DATABASE_URL="postgresql://<USER>:<PASSWORD>@localhost:5432/<DATABASE>?host=/cloudsql/<PROJECT_ID>:me-central1:<INSTANCE_NAME>"
  ```

### 2. Running Migrations Locally
- Apply migrations to your local Postgres instance:
  ```bash
  npx prisma migrate dev
  ```
- Generate Prisma Client types:
  ```bash
  npm run db:generate
  ```
- Validate schema formatting and constraints:
  ```bash
  npm run db:validate
  ```
