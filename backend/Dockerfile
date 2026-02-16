# ---- Build stage ----
FROM node:22-alpine AS builder

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy workspace root files needed for install
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY backend/package.json backend/package.json
COPY shared/package.json shared/package.json

# Copy source BEFORE install so pnpm symlinks are created on top of real files
COPY backend/ backend/
COPY shared/ shared/

# Install dependencies
RUN pnpm install --frozen-lockfile --filter @screenquest/backend...

# Generate Prisma client
RUN cd backend && npx prisma generate

# Copy generated Prisma client to a predictable location for the production stage
RUN cp -r $(find /app/node_modules/.pnpm -path "*/.prisma/client" -type d | head -1) /app/prisma-client

# Build
RUN cd backend && pnpm build

# ---- Production stage ----
FROM node:22-alpine AS production

LABEL org.opencontainers.image.source="https://gitlab.com/screenquest/screenquest"
LABEL org.opencontainers.image.description="ScreenQuest Backend API"

RUN corepack enable && corepack prepare pnpm@latest --activate

# Create non-root user
RUN addgroup -g 1001 -S appuser && adduser -S appuser -u 1001

WORKDIR /app

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY backend/package.json backend/package.json
COPY shared/package.json shared/package.json

# Install production deps only
RUN pnpm install --frozen-lockfile --prod --filter @screenquest/backend...

# Copy built output + prisma schema
COPY --from=builder /app/backend/dist backend/dist
COPY backend/prisma backend/prisma

# Copy generated Prisma client from builder into .prisma/client (where @prisma/client expects it)
COPY --from=builder /app/prisma-client node_modules/.prisma/client

# Create uploads dir (for local dev fallback)
RUN mkdir -p backend/uploads/proofs && chown -R appuser:appuser backend/uploads

# Give appuser ownership of node_modules (needed for prisma migrate deploy)
RUN chown -R appuser:appuser /app/node_modules

WORKDIR /app/backend

USER appuser

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/health || exit 1

# Run migrations then start
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]
