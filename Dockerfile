# Install dependencies only when needed
FROM node:16.13-alpine AS deps
# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# Rebuild the source code only when needed
FROM node:16.13-alpine AS builder
WORKDIR /app
ARG NODE_ENV
ARG NEXT_PUBLIC_FB_PROJECT_ID
ARG NEXT_PUBLIC_FB_API_KEY
ARG NEXT_PUBLIC_FB_MESSAGING_SENDER_ID
ARG NEXT_PUBLIC_FB_APP_ID
ARG NEXT_PUBLIC_FB_MEASUREMENT_ID
ARG NEXT_PUBLIC_AL_APP_ID
ARG NEXT_PUBLIC_AL_ADMIN_KEY
ARG NEXT_PUBLIC_AL_SEARCH_KEY
ARG NEXT_PUBLIC_GM_API_KEY
ARG NEXT_PUBLIC_GC_GRADE

ENV NODE_ENV=${NODE_ENV}
ENV NEXT_PUBLIC_FB_PROJECT_ID=${NEXT_PUBLIC_FB_PROJECT_ID}
ENV NEXT_PUBLIC_FB_API_KEY=${NEXT_PUBLIC_FB_API_KEY}
ENV NEXT_PUBLIC_FB_MESSAGING_SENDER_ID=${NEXT_PUBLIC_FB_MESSAGING_SENDER_ID}
ENV NEXT_PUBLIC_FB_APP_ID=${NEXT_PUBLIC_FB_APP_ID}
ENV NEXT_PUBLIC_FB_MEASUREMENT_ID=${NEXT_PUBLIC_FB_MEASUREMENT_ID}
ENV NEXT_PUBLIC_AL_APP_ID=${NEXT_PUBLIC_AL_APP_ID}
ENV NEXT_PUBLIC_AL_ADMIN_KEY=${NEXT_PUBLIC_AL_ADMIN_KEY}
ENV NEXT_PUBLIC_AL_SEARCH_KEY=${NEXT_PUBLIC_AL_SEARCH_KEY}
ENV NEXT_PUBLIC_GM_API_KEY=${NEXT_PUBLIC_GM_API_KEY}
ENV NEXT_PUBLIC_GC_GRADE=${NEXT_PUBLIC_GC_GRADE}
COPY . .
COPY --from=deps /app/node_modules ./node_modules
RUN npm run build && npm install

# Production image, copy all the files and run next
FROM node:16.13-alpine AS runner
WORKDIR /app

ENV NODE_ENV production

RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

# You only need to copy next.config.js if you are NOT using the default configuration
COPY --from=builder /app/next.config.js ./
COPY --from=builder /app/next-i18next.config.js ./
COPY --from=builder /app/htmlserializer.js ./
COPY --from=builder /app/tailwind.config.js ./
COPY --from=builder /app/firebaseConfig.js ./
COPY --from=builder /app/postcss.config.js ./
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

USER nextjs

EXPOSE 3000

ENV PORT 3000

# Next.js collects completely anonymous telemetry data about general usage.
# Learn more here: https://nextjs.org/telemetry
# Uncomment the following line in case you want to disable telemetry.
# ENV NEXT_TELEMETRY_DISABLED 1

CMD ["node_modules/.bin/next", "start"]
# CMD ["node", "server.js"]