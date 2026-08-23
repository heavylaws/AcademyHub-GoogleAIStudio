# AcademyHub

AcademyHub is a multi-tenant sports performance, biomechanics assessment, and academy management platform built with Next.js 15, Better Auth, Prisma ORM, and PostgreSQL.

---

## Quick Start (Local Development)

### 1. Prerequisites
- Node.js 20+
- PostgreSQL 16 (running locally or via Docker)

### 2. Setup Environment
Copy `.env.example` to `.env` and set local secrets:
```bash
cp .env.example .env
```
Ensure `BETTER_AUTH_SECRET` is set to a secret string at least 32 characters long. Set `ADMIN_BOOTSTRAP_EMAIL` to your email address to seed the first Platform Admin account.

### 3. Database Migration & Initial Seed
```bash
# Run PostgreSQL migrations
npx prisma migrate deploy

# Seed baseline Academy record and grant Platform Admin to ADMIN_BOOTSTRAP_EMAIL
npx prisma db seed
```

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Documentation Links

Detailed project documentation lives in the [`docs/`](./docs) directory:

- [**Architecture Overview** (`docs/ARCHITECTURE.md`)](./docs/ARCHITECTURE.md) — Stack, tenancy model (`Academy`/`Membership`), 3-stage authorization pipeline, onboarding flow, and cost controls.
- [**Decision Log** (`docs/DECISIONS.md`)](./docs/DECISIONS.md) — Key architectural decisions, rationale, rejected alternatives, and consequences.
- [**Known Issues & Technical Debt** (`docs/KNOWN_ISSUES.md`)](./docs/KNOWN_ISSUES.md) — Categorized open issues, technical debt, and severity classifications.
- [**Deployment Guide** (`docs/DEPLOYMENT.md`)](./docs/DEPLOYMENT.md) — Containerization, production environment configuration, and operations.
