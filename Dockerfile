# Base stage with Node.js
FROM node:20-alpine AS base

# Install dependencies and build the app
FROM base AS builder
WORKDIR /app

# Install dependencies required for Prisma
RUN apk add --no-cache gcompat

# Copy package.json and package-lock.json first for caching layer
COPY package*.json ./

# Install dev dependencies (including Prisma)
RUN npm install --include=dev

# Copy the remaining app files
COPY tsconfig.json ./
COPY prisma ./prisma
COPY src ./src

# Generate Prisma client
RUN npx prisma generate

# Build the app
RUN npm run build

# Prune dev dependencies and keep only production dependencies
RUN npm prune --production

# Final stage to run the app
FROM base AS runner
WORKDIR /app

# Create a non-root user
RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 redcloud

# Copy built app and dependencies
COPY --from=builder --chown=redcloud:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=redcloud:nodejs /app/dist ./dist
COPY --from=builder --chown=redcloud:nodejs /app/package.json ./package.json
COPY --from=builder --chown=redcloud:nodejs /app/prisma ./prisma

# Switch to non-root user
USER redcloud

# Expose the application port
EXPOSE 3000

# Start the application
CMD ["node", "/app/dist/index.js"]
