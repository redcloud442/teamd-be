# Stage 1: Base image with Bun and Doppler
FROM oven/bun:1.2.6 AS base

# Install dependencies
RUN apt-get update && apt-get install -y \
  curl \
  bash \
  openssl \
  wget \
  ca-certificates \
  gnupg \
  dos2unix \
  unzip \
  && rm -rf /var/lib/apt/lists/*

# Install Doppler CLI
RUN apt-get update && apt-get install -y apt-transport-https ca-certificates curl gnupg && \
    curl -sLf --retry 3 --tlsv1.2 --proto "=https" 'https://packages.doppler.com/public/cli/gpg.DE2A7741A397C129.key' | \
    gpg --dearmor -o /usr/share/keyrings/doppler-archive-keyring.gpg && \
    echo "deb [signed-by=/usr/share/keyrings/doppler-archive-keyring.gpg] https://packages.doppler.com/public/cli/deb/debian any-version main" > /etc/apt/sources.list.d/doppler-cli.list && \
    apt-get update && apt-get install -y doppler

# Stage 2: Builder
FROM base AS builder
WORKDIR /app

# Copy package files and install dependencies
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

RUN bun add -d bun-types

# Copy source and config files
COPY tsconfig.json ./
COPY prisma ./prisma
COPY src ./src
COPY scripts ./scripts

# Generate Prisma client
RUN bun prisma generate

# Build the application
RUN bun run build

# Reinstall production-only dependencies
RUN bun install --production

# Stage 3: Final runtime image
FROM base AS runner
WORKDIR /app

# Create a non-root user with a proper home directory for Doppler
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 --home /home/redcloud redcloud && \
    mkdir -p /home/redcloud && chown -R redcloud:nodejs /home/redcloud

# Copy app files from builder with correct ownership
COPY --from=builder --chown=redcloud:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=redcloud:nodejs /app/dist ./dist
COPY --from=builder --chown=redcloud:nodejs /app/package.json ./package.json
COPY --from=builder --chown=redcloud:nodejs /app/prisma ./prisma

# Copy and prepare entrypoint script
COPY scripts/entrypoint_overwrited.sh /app/entrypoint.sh
RUN dos2unix /app/entrypoint.sh && chmod +x /app/entrypoint.sh

# Ensure /app is owned by non-root user
RUN chown -R redcloud:nodejs /app

# Use non-root user
USER redcloud

# Set environment variables and expose port
ENV PORT=3000
EXPOSE 3000

# Entrypoint and default command
ENTRYPOINT ["/app/entrypoint.sh"]
CMD ["bun", "prod"]
