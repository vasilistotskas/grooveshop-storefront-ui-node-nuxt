ARG NODE_VERSION=25.0.0

FROM node:${NODE_VERSION}-slim AS build

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN corepack enable pnpm

WORKDIR /app

COPY package.json pnpm-lock.yaml ./

RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile --prefer-offline

COPY . .

ENV NODE_ENV=production \
    NUXT_HOST=0.0.0.0 \
    NUXT_PORT=3000 \
    NUXT_PUBLIC_APP_TITLE="Webside - Το side της τεχνολογίας" \
    NUXT_SITE_DESCRIPTION="Μπες στο side της τεχνολογίας, εύκολα, δωρεάν και με ασφάλεια." \
    NUXT_SITE_URL="https://webside.gr" \
    NUXT_PUBLIC_MEDIA_STREAM_ORIGIN="https://assets.webside.gr" \
    NUXT_PUBLIC_STATIC_ORIGIN="https://static.webside.gr"

RUN pnpm run build

FROM node:${NODE_VERSION}-slim AS production

ENV NODE_ENV=production

WORKDIR /app

COPY --from=build --chown=node:node /app/.output .

USER node

EXPOSE 3000

ENTRYPOINT ["node", "server/index.mjs"]
