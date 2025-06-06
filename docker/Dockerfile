ARG NODE_VERSION=24.1.0

FROM node:${NODE_VERSION}-alpine AS build

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN corepack enable pnpm

WORKDIR /app

COPY . .

ENV NODE_ENV=production \
    NUXT_HOST=0.0.0.0 \
    NUXT_PORT=3000 \
    NUXT_PUBLIC_APP_TITLE="Webside - Το side της τεχνολογίας" \
    NUXT_SITE_DESCRIPTION="Μπες στο side της τεχνολογίας, εύκολα, δωρεάν και με ασφάλεια." \
    NUXT_SITE_URL="https://webside.gr" \
    NUXT_PUBLIC_MEDIA_STREAM_ORIGIN="https://assets.webside.gr" \
    NUXT_PUBLIC_STATIC_ORIGIN="https://static.webside.gr"

RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

RUN pnpm run build

FROM node:${NODE_VERSION}-alpine AS production

WORKDIR /app

COPY --from=build --chown=node:node /app/.output .
USER node

ENTRYPOINT ["node", "server/index.mjs"]
