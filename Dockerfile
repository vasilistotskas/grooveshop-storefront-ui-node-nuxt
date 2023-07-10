FROM node:hydrogen-alpine3.18 as builder

COPY . ./
WORKDIR /app

RUN rm -rf ./node_modules & \
    rm -rf ./build & \
    rm -rf ./dist

RUN npm install && npm run build

FROM node:hydrogen-alpine3.18 as production

ENV NUXT_HOST 0.0.0.0
ENV NUXT_PORT 3000
ENV NODE_ENV production


COPY --from=builder /app/.output /app/.output
COPY --from=builder /app/.nuxt /app/.nuxt

WORKDIR /app
RUN npm install -g pm2 && \
    chown -R node:node /app
USER node

ENTRYPOINT ["pm2-runtime", "/app/.output/server/index.mjs"]
