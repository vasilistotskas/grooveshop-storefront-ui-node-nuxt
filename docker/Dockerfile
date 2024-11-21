ARG NODE_VERSION=23.2.0

FROM node:${NODE_VERSION}-alpine AS build

ENV NODE_ENV=production

WORKDIR /app

COPY . .

RUN npm ci && \
    npm run build

FROM node:${NODE_VERSION}-alpine AS production

WORKDIR /app

COPY --from=build --chown=node:node /app/.output .
USER node

ENTRYPOINT ["node", "server/index.mjs"]
