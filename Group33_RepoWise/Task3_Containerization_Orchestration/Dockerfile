# ==============================================================================
# Multi-Stage Production Dockerfile for RepoWise Server (PBL Microservice)
# ==============================================================================

# ----------------- STAGE 1: Build & Compilation Environment -----------------
FROM node:22-alpine AS builder

WORKDIR /app

# Install native compatibility tools required by Alpine Linux
RUN apk add --no-cache libc6-compat

# Copy package manifests & prisma schema first to maximize Docker layer caching
COPY package*.json ./
COPY prisma ./prisma/

# Install full dependencies (including build devDependencies like typescript)
RUN npm ci

# Copy TypeScript configuration and application source code
COPY tsconfig.json ./
COPY src ./src/

# Generate Prisma ORM client and compile TypeScript to production JavaScript
RUN npx prisma generate && npm run build

# Remove development dependencies to keep production bundle lean
RUN npm prune --production

# ----------------- STAGE 2: Minimal Production Runtime Environment -----------------
FROM node:22-alpine AS runner

WORKDIR /app

# Set production environment variables
ENV NODE_ENV=production
ENV PORT=5000

# Copy only runtime dependencies, compiled dist, and prisma artifacts
COPY --from=builder --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/dist ./dist
COPY --from=builder --chown=node:node /app/prisma ./prisma
COPY --from=builder --chown=node:node /app/package*.json ./

# Enforce Non-Root Execution for Container Security (Principle of Least Privilege)
USER node

EXPOSE 5000

# Container liveness healthcheck probe
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5000/health || exit 1

# Start the compiled Node.js backend server
CMD ["node", "dist/server.js"]
