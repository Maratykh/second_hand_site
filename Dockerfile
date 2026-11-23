# Build stage
FROM node:20-slim AS builder
WORKDIR /app

# Install bun for faster installs
RUN npm install -g bun

# Copy package files
COPY package.json bun.lock ./

# Install dependencies
RUN bun install --frozen-lockfile

# Copy source
COPY . .

# Build frontend
RUN bun run build

# Production stage
FROM node:20-slim
WORKDIR /app

RUN npm install -g bun

# Copy built assets and server files
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/server.ts ./
COPY --from=builder /app/firebase-applet-config.json ./
COPY --from=builder /app/src/utils/vkAlbumParser.ts ./src/utils/vkAlbumParser.ts
COPY --from=builder /app/tsconfig.json ./

# Cloud Run sets PORT env var
ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080

CMD ["npx", "tsx", "server.ts"]
