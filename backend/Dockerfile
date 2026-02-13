# ---- Build stage ----
FROM node:22-alpine AS builder

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy workspace root files needed for install
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY backend/package.json backend/package.json
COPY shared/package.json shared/package.json

# Install dependencies
RUN pnpm install --frozen-lockfile --filter @screenquest/backend...

# Copy source
COPY backend/ backend/
COPY shared/ shared/

# Generate Prisma client
RUN cd backend && npx prisma generate

# Build
RUN cd backend && pnpm build

# ---- Production stage ----
FROM node:22-alpine AS production

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY backend/package.json backend/package.json
COPY shared/package.json shared/package.json

# Install production deps only
RUN pnpm install --frozen-lockfile --prod --filter @screenquest/backend...

# Copy built output + prisma
COPY --from=builder /app/backend/dist backend/dist
COPY --from=builder /app/backend/node_modules/.prisma backend/node_modules/.prisma
COPY backend/prisma backend/prisma

# Create uploads dir
RUN mkdir -p backend/uploads/proofs

WORKDIR /app/backend

EXPOSE 3000

# Run migrations then start
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]
