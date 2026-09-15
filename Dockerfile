# Multi-stage Docker build for Railway deployment
FROM node:20-slim AS builder

WORKDIR /app

# Copy package descriptors
COPY package*.json ./

# Install all dependencies including optional native binaries
RUN npm install --include=dev --include=optional

# Copy application sources
COPY . .

# Build Vite frontend and bundled Express server
RUN npm run build

# Production runtime stage
FROM node:20-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Copy necessary files from builder
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/data ./data

EXPOSE 3000

CMD ["node", "dist/server.cjs"]
