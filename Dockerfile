# syntax=docker/dockerfile:1

# ---- deps stage ----
FROM node:20-alpine AS deps
WORKDIR /app

# Install system dependencies needed for native modules (e.g. bcrypt)
RUN apk add --no-cache libc6-compat openssl

COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts

# ---- builder stage ----
FROM node:20-alpine AS builder
WORKDIR /app

RUN apk add --no-cache libc6-compat openssl

COPY package.json package-lock.json ./
# Install all deps (including devDeps needed for build)
RUN npm ci --ignore-scripts

COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build Next.js — env vars needed for build-time checks.
# Actual secrets are injected at runtime; set SKIP_ENV_VALIDATION to bypass
# the startup Zod check that would fail without a real DATABASE_URL.
ENV SKIP_ENV_VALIDATION=true
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# ---- runner stage ----
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN apk add --no-cache libc6-compat openssl && \
    addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy production node_modules and generated Prisma client
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Copy build artifacts
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public 2>/dev/null || true

# Copy Prisma schema for migrations at container start
COPY --from=builder /app/prisma ./prisma

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Run database migrations then start the server
CMD ["sh", "-c", "npx prisma migrate deploy && node server.js"]
