FROM node:21.0.0-alpine as builder

WORKDIR /app

RUN chmod -R 777 /app && \
    chown -R node:node /app

COPY ./ ./

ENV GENERATE_SOURCEMAP=false
ENV NODE_OPTIONS="--max-old-space-size=8192"

RUN rm -rf ./node_modules & \
    rm -rf ./nuxt & \
    rm -rf ./output

RUN apk add --no-cache git && \
    git config --global --add safe.directory /app && \
    npm install && \
    npm ci && \
    npm run build

FROM node:21.0.0-alpine as production

ENV NUXT_HOST 0.0.0.0
ENV NUXT_PORT 3000
ENV NODE_ENV production

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.output ./.output
COPY --from=builder /app/.nuxt ./.nuxt
COPY --from=builder /app/package*.json ./

RUN npm install -g pm2

RUN chmod -R 777 /app && \
    chown -R node:node /app

USER node

ENTRYPOINT ["pm2-runtime", "/app/.output/server/index.mjs"]
