# Deployment and Dockerization Guide

## Local development

1. Copy `.env.example` to `.env` and fill the required values.
2. Install dependencies:
   npm install
3. Start PostgreSQL locally or use Docker Compose:
   docker compose up db -d
4. Run migrations and start the app:
   npm run db:push
   npm run dev

## Docker Compose

This repository is set up for a simple local Docker deployment.

```bash
cp .env.example .env
docker compose up --build
```

The compose file starts:
- a PostgreSQL 16 database
- the AcademyHub application on port 3000
- built-in health checks for both PostgreSQL and the app

The app exposes a readiness endpoint at `/api/health` for deployment checks and container orchestration.

## Production image

```bash
docker build -t academyhub:latest .
docker run --rm -p 3000:3000 \
  -e DATABASE_URL="postgresql://postgres:postgres@host.docker.internal:5432/academyhub?schema=public" \
  -e BETTER_AUTH_SECRET="change_me_in_production" \
  -e APP_URL="https://your-domain.example" \
  -e BETTER_AUTH_URL="https://your-domain.example" \
  -e GEMINI_API_KEY="replace_with_your_gemini_key" \
  -e NEXT_PUBLIC_ENABLE_AI_PIPELINE="false" \
  academyhub:latest
```

## Notes

- The app uses Prisma. Docker startup runs migrations automatically before serving traffic.
- The generated app is configured for `next build` + `next start` in production mode.
- Set strong secrets and non-default credentials before any external deployment.
