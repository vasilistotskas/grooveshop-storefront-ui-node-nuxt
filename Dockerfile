FROM node:hydrogen-alpine3.18 as builder

WORKDIR /app

RUN chmod -R 777 /app && \
    chown -R node:node /app

COPY . ./

RUN rm -rf ./node_modules & \
    rm -rf ./build & \
    rm -rf ./dist

RUN NODE_OPTIONS="--max-old-space-size=8192" npm ci && npm run build

FROM node:hydrogen-alpine3.18 as production

ENV NUXT_HOST 0.0.0.0
ENV NUXT_PORT 3000
ENV NODE_ENV production

COPY --from=builder /app/node_modules /app/node_modules
COPY --from=builder /app/.output /app/.output
COPY --from=builder /app/.nuxt /app/.nuxt
COPY --from=builder /app/package.json /app/package.json
COPY --from=builder /app/package-lock.json /app/package-lock.json

WORKDIR /app
RUN npm install -g pm2 && \
    chown -R node:node /app
USER node

ENTRYPOINT ["pm2-runtime", "/app/.output/server/index.mjs"]
