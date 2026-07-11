# Install dependencies only when needed
FROM node:22-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@8.15.9 --activate
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY functions/package.json ./functions/package.json
RUN pnpm install --frozen-lockfile --filter sciteens...

# Rebuild the source code only when needed
FROM node:22-alpine AS builder
WORKDIR /app
ARG NODE_ENV=production
ARG NEXT_PUBLIC_FB_PROJECT_ID
ARG NEXT_PUBLIC_FB_AUTH_DOMAIN
ARG NEXT_PUBLIC_FB_API_KEY
ARG NEXT_PUBLIC_FB_MESSAGING_SENDER_ID
ARG NEXT_PUBLIC_FB_APP_ID
ARG NEXT_PUBLIC_FB_MEASUREMENT_ID
ARG NEXT_PUBLIC_AL_APP_ID
ARG NEXT_PUBLIC_AL_SEARCH_KEY

ENV NODE_ENV=${NODE_ENV}
ENV NEXT_PUBLIC_FB_PROJECT_ID=${NEXT_PUBLIC_FB_PROJECT_ID}
ENV NEXT_PUBLIC_FB_AUTH_DOMAIN=${NEXT_PUBLIC_FB_AUTH_DOMAIN}
ENV NEXT_PUBLIC_FB_API_KEY=${NEXT_PUBLIC_FB_API_KEY}
ENV NEXT_PUBLIC_FB_MESSAGING_SENDER_ID=${NEXT_PUBLIC_FB_MESSAGING_SENDER_ID}
ENV NEXT_PUBLIC_FB_APP_ID=${NEXT_PUBLIC_FB_APP_ID}
ENV NEXT_PUBLIC_FB_MEASUREMENT_ID=${NEXT_PUBLIC_FB_MEASUREMENT_ID}
ENV NEXT_PUBLIC_AL_APP_ID=${NEXT_PUBLIC_AL_APP_ID}
ENV NEXT_PUBLIC_AL_SEARCH_KEY=${NEXT_PUBLIC_AL_SEARCH_KEY}
ENV NEXT_TELEMETRY_DISABLED=1

COPY . .
COPY --from=deps /app/node_modules ./node_modules
RUN corepack enable && corepack prepare pnpm@8.15.9 --activate && pnpm run build

# Production image, copy only the standalone output
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
