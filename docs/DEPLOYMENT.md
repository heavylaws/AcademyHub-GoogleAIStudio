# AcademyHub Deployment and Operations Guide

## 1. Environment Configuration

Copy `.env.example` to `.env` and configure production credentials:

```bash
cp .env.example .env
```

### Required Production Environment Variables

| Variable | Description | Security Requirements |
| :--- | :--- | :--- |
| `DATABASE_URL` | PostgreSQL connection string | Must connect to Postgres 16 database |
| `BETTER_AUTH_SECRET` | Authentication cookie signing secret | **Must be at least 32 characters** (non-placeholder) |
| `APP_URL` | Canonical application URL | e.g. `https://app.academyhub.com` |
| `BETTER_AUTH_URL` | Better Auth endpoint URL | Defaults to `APP_URL` |
| `ADMIN_BOOTSTRAP_EMAIL` | Initial platform admin email | Used by seed script to assign `isPlatformAdmin: true` |
| `GEMINI_API_KEY` | Google Generative AI API key | Spending credential; handle securely |
| `BILLING_ENABLED` | Server billing feature toggle | Set `'false'` to gate off unvalidated billing routes |
| `AI_RATE_LIMIT_PER_MINUTE` | Per-user rate limit for AI routes | Defaults to `10` |
| `AI_MONTHLY_CAP_PER_ACADEMY` | Per-academy monthly AI call cap | Defaults to `1000` |

---

## 2. Database Migrations & Initial Seeding

AcademyHub uses PostgreSQL 16 managed by Prisma ORM.

### Applying Migrations (Production)
```bash
npx prisma migrate deploy
```

### Initial Platform Admin Seeding
Set `ADMIN_BOOTSTRAP_EMAIL` in `.env` to the desired email address, then run:
```bash
npx prisma db seed
```
*The seed script creates the default Academy record and grants `isPlatformAdmin: true` to the specified user.*

---

## 3. Local Docker Development

Start local PostgreSQL 16 database and AcademyHub container via Docker Compose:

```bash
docker compose up --build -d
```

The compose setup starts:
- PostgreSQL 16 container on port 5432 with health check
- AcademyHub application on port 3000

---

## 4. Production Docker Deployment

### Building the Image
```bash
docker build -t academyhub:latest .
```

### Running the Container
```bash
docker run -d --name academyhub \
  -p 3000:3000 \
  -e DATABASE_URL="postgresql://user:password@db-host:5432/academyhub?schema=public" \
  -e BETTER_AUTH_SECRET="your-32-character-or-longer-production-secret" \
  -e APP_URL="https://app.academyhub.com" \
  -e BETTER_AUTH_URL="https://app.academyhub.com" \
  -e ADMIN_BOOTSTRAP_EMAIL="admin@academyhub.com" \
  -e GEMINI_API_KEY="your-real-gemini-api-key" \
  -e BILLING_ENABLED="false" \
  academyhub:latest
```

---

## 5. Health Checks & Observability

- **Health Check Endpoint**: `/api/health`
- Returns HTTP 200 `{ status: "ok", database: "connected" }` when PostgreSQL connection is healthy.
- Returns HTTP 503 `{ status: "degraded", database: "disconnected" }` if PostgreSQL database query fails.
