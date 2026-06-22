# ─── Stage 1: Build ──────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

# Enable pnpm
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

WORKDIR /app

# Install dependencies (cached unless lockfile changes)
COPY package.json pnpm-lock.yaml .npmrc ./
COPY prisma ./prisma
RUN pnpm install --frozen-lockfile --prod

# Copy source and Prisma schema
COPY tsconfig.json ./
COPY src ./src

# Generate Prisma client and compile TypeScript
RUN pnpm run prisma:generate
RUN pnpm run build

# ─── Stage 2: Production runtime ───────────────────────────────────────────────
FROM node:20-alpine AS production

RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

WORKDIR /app
ENV NODE_ENV=production

# Only copy what's needed to run — no dev dependencies, no source files
COPY package.json pnpm-lock.yaml .npmrc ./
RUN pnpm install --frozen-lockfile --prod

# Copy compiled output and Prisma files from the build stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Create uploads directory (only used if STORAGE_TYPE=local)
RUN mkdir -p uploads logs

EXPOSE 3000

# Run migrations then start the server
CMD ["sh", "-c", "pnpm run prisma:migrate && node dist/index.js"]
