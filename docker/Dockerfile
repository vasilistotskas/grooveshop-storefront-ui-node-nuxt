ARG NODE_VERSION=23.2.0

FROM node:${NODE_VERSION}-alpine AS build

WORKDIR /app

COPY . .

# Set environment variables
ENV NODE_ENV=production \
    NUXT_HOST=0.0.0.0 \
    NUXT_PORT=3000 \
    NUXT_PUBLIC_APP_TITLE="Webside - Το side της τεχνολογίας" \
    NUXT_PUBLIC_APP_DESCRIPTION="Μπες στο side της τεχνολογίας, εύκολα, δωρεάν και με ασφάλεια." \
    NUXT_PUBLIC_SITE_DESCRIPTION="Μπες στο side της τεχνολογίας, εύκολα, δωρεάν και με ασφάλεια." \
    NUXT_PUBLIC_APP_LOGO="https://webside.gr/img/logo.png" \
    NUXT_PUBLIC_BASE_URL="https://webside.gr" \
    NUXT_PUBLIC_SITE_URL="https://webside.gr" \
    NUXT_PUBLIC_SITE_NAME="Webside" \
    NUXT_PUBLIC_MEDIA_STREAM_ORIGIN="https://assets.webside.gr" \
    NUXT_PUBLIC_STATIC_ORIGIN="https://static.webside.gr" \
    NUXT_PUBLIC_DOMAIN_VERIFY_ID="dc42cdef16dacdede6a6b7929b712085" \
    NUXT_PUBLIC_LOCALES="el" \
    NUXT_PUBLIC_LANGUAGE="el" \
    NUXT_PUBLIC_DEFAULT_LOCALE="el"

RUN npm ci && \
    npm run build

FROM node:${NODE_VERSION}-alpine AS production

WORKDIR /app

COPY --from=build --chown=node:node /app/.output .
USER node

ENTRYPOINT ["node", "server/index.mjs"]
