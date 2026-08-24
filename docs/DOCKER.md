# Docker

AcademyHub can run as a standalone Next.js container or with Docker Compose.

## Quick start

Create the runtime environment file and provide real values for the server-side
secrets:

```bash
cp .env.example .env
docker compose up --build
```

Open http://localhost:3000. The Compose file starts the app and a local
PostgreSQL 16 instance. The app's database URL points at the Compose `db`
service, so it does not use `localhost` from inside the container.

## Database migrations

The current application still uses Firestore as its primary data store. When
Prisma-backed routes are enabled, apply the checked-in migrations explicitly:

```bash
docker compose --profile migrations run --rm migrate
```

Migrations are intentionally separate from the web container so multiple app
replicas cannot try to migrate the database at the same time.

## Production container

Build and run the image with runtime environment variables injected by the
deployment platform or secret manager:

```bash
docker build -t academyhub:latest .
docker run --rm -p 3000:3000 --env-file .env academyhub:latest
```

Do not bake `.env`, Firebase service-account JSON, Stripe keys, or Gemini keys
into the image. `FIREBASE_SERVICE_ACCOUNT_KEY` should contain the raw JSON when
the container is not using an attached Google service-account identity.

The image listens on `0.0.0.0:3000` and includes a Docker health check for `/`.
Set `PORT` only on the host side or deployment platform; the container listens
on port 3000 unless the image is deliberately reconfigured.