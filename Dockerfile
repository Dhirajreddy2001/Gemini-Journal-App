# Build and runtime container for Google Cloud Run
FROM node:22-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json bun.lock* ./
RUN npm ci

# Copy source code and build
COPY . .
RUN npm run build

# Production runtime stage
FROM node:22-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

# Install production-only dependencies
COPY package*.json bun.lock* ./
RUN npm ci --omit=dev

# Copy compiled assets from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/firebase-applet-config.json ./firebase-applet-config.json

# Expose container port for Cloud Run
EXPOSE 3000

# Start server entrypoint
CMD ["node", "dist/server.cjs"]
