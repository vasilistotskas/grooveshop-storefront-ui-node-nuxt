FROM node:20.8.1-alpine as builder

WORKDIR /app

RUN chmod -R 777 /app && \
    chown -R node:node /app

COPY ./ ./

ENV GENERATE_SOURCEMAP=false

RUN rm -rf ./node_modules & \
    rm -rf ./nuxt & \
    rm -rf ./output

RUN npm install -g pnpm && \
    pnpm install --frozen-lockfile && \
    pnpm run build

FROM node:20.8.1-alpine as production

ENV NUXT_HOST 0.0.0.0
ENV NUXT_PORT 3000
ENV NODE_ENV production
ENV PNPM_HOME=/usr/local/bin

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.output ./output
COPY --from=builder /app/.nuxt ./nuxt
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/pnpm-lock.yaml ./

RUN npm install -g pnpm && \
    pnpm install -g pm2

RUN chmod -R 777 /app && \
    chown -R node:node /app

USER node

ENTRYPOINT ["pm2-runtime", "/app/.output/server/index.mjs"]
