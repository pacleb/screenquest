# ---- Build stage ----
FROM node:22-slim AS builder

RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy workspace root files needed for install
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY backend/package.json backend/package.json
COPY shared/package.json shared/package.json

# Copy source BEFORE install so pnpm symlinks are created on top of real files
COPY backend/ backend/
COPY shared/ shared/

# Dummy DATABASE_URL so Prisma's postinstall schema validation passes at build time
ENV DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy"
ENV DIRECT_URL="postgresql://dummy:dummy@localhost:5432/dummy"

# Install dependencies (prisma postinstall runs generate automatically)
RUN pnpm install --frozen-lockfile --filter @screenquest/backend...

# Generate Prisma client (postinstall may not find schema in monorepo context)
RUN cd backend && npx prisma generate

# Build
RUN cd backend && pnpm build

# ---- Production stage ----
FROM node:22-slim AS production

LABEL org.opencontainers.image.source="https://github.com/pacleb/screenquest"
LABEL org.opencontainers.image.description="ScreenQuest Backend API"

RUN apt-get update && apt-get install -y openssl wget && rm -rf /var/lib/apt/lists/*
RUN corepack enable && corepack prepare pnpm@latest --activate

# Create non-root user
RUN addgroup --gid 1001 appuser && adduser --uid 1001 --gid 1001 --disabled-password --gecos '' appuser

WORKDIR /app

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY backend/package.json backend/package.json
COPY shared/package.json shared/package.json

# Dummy DATABASE_URL so Prisma's postinstall schema validation passes at build time
# Use ARG (not ENV) so this does NOT persist to runtime — Render injects the real URL
ARG DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy"
ARG DIRECT_URL="postgresql://dummy:dummy@localhost:5432/dummy"

# Install production deps only
RUN pnpm install --frozen-lockfile --prod --filter @screenquest/backend...

# Copy built output + prisma schema
COPY --from=builder /app/backend/dist backend/dist
COPY backend/prisma backend/prisma

# Re-generate Prisma client (ensures correct engine binaries for this OS)
RUN cd backend && npx prisma generate

# Create uploads dir (for local dev fallback)
RUN mkdir -p backend/uploads/proofs && chown -R appuser:appuser backend/uploads

WORKDIR /app/backend

USER appuser

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/health || exit 1

# Run migrations then start; fail fast if Render env is incomplete.
CMD ["sh", "-c", "if [ -z \"$DATABASE_URL\" ]; then echo 'FATAL: DATABASE_URL is not set. Configure it in Render service environment variables.' >&2; exit 1; fi; npx prisma migrate deploy && node dist/main.js"]
