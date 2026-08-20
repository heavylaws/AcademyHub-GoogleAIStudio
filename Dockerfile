FROM node:20-alpine AS base
WORKDIR /app

RUN apk add --no-cache openssl

COPY package*.json ./
RUN npm ci

COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000

COPY --from=base /app/package*.json ./
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/.next ./.next
COPY --from=base /app/public ./public
COPY --from=base /app/prisma ./prisma
COPY --from=base /app/app ./app
COPY --from=base /app/components ./components
COPY --from=base /app/lib ./lib
COPY --from=base /app/services ./services
COPY --from=base /app/types ./types
COPY --from=base /app/hooks ./hooks
COPY --from=base /app/next.config.ts ./next.config.ts
COPY --from=base /app/postcss.config.mjs ./postcss.config.mjs
COPY --from=base /app/tsconfig.json ./tsconfig.json
COPY --from=base /app/eslint.config.mjs ./eslint.config.mjs
COPY --from=base /app/metadata.json ./metadata.json

RUN npx prisma generate

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then((res) => process.exit(res.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["sh", "-c", "npx prisma migrate deploy && npx next start -H 0.0.0.0 -p ${PORT}"]
