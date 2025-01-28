FROM node:20-alpine AS base

FROM base AS builder

RUN apk add --no-cache gcompat
WORKDIR /app

COPY package*json tsconfig.json src ./

RUN npm install prisma --save-dev
# Generate Prisma client
RUN npx prisma generate --schema ./prisma/schema.prisma


RUN npm ci && \
    npm run build && \
    npm prune --production

FROM base AS runner
WORKDIR /app

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 redcloud

COPY --from=builder --chown=redcloud:nodejs /app/node_modules /app/node_modules
COPY --from=builder --chown=redcloud:nodejs /app/dist /app/dist
COPY --from=builder --chown=redcloud:nodejs /app/package.json /app/package.json

USER redcloud

EXPOSE 3000

CMD ["node", "/app/dist/index.js"]