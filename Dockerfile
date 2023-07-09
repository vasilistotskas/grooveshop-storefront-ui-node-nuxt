FROM node:18.16.0-alpine as construction

WORKDIR /app

RUN chmod -R 777 /app && \
    chown -R node:node /app

COPY ./ ./

RUN rm -rf ./node_modules & \
    rm -rf ./build & \
    rm -rf ./dist

RUN npm ci && npm run build

FROM node:18.16.0-alpine as deployment

USER node

ENV NUXT_HOST 0.0.0.0
ENV NUXT_PORT 3000
ENV NODE_ENV production

WORKDIR /app
RUN npm install -g pm2 && \
    chown -R node:node /app
USER node

COPY --from=construction /app/.output /app/.output
COPY --from=construction /app/.nuxt /app/.nuxt

ENTRYPOINT ["pm2-runtime", "/app/.output/server/index.mjs"]
