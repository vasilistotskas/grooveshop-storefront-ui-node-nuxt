FROM node:hydrogen-alpine3.18 as builder

COPY . /src
WORKDIR /src

RUN rm -rf ./node_modules & \
    rm -rf ./build & \
    rm -rf ./dist

RUN NODE_OPTIONS="--max-old-space-size=8192" npm install && npm run build

FROM node:hydrogen-alpine3.18 as production

ENV NUXT_HOST 0.0.0.0
ENV NUXT_PORT 3000
ENV NODE_ENV production
ENV NUXT_APP_BASE_URL http://localhost:3000
ENV NUXT_PUBLIC_BASE_URL http://localhost:3000

COPY --from=builder /src/node_modules /app/node_modules
COPY --from=builder /src/.output /app/.output
COPY --from=builder /src/.nuxt /app/.nuxt
COPY --from=builder /src/package.json /app/package.json
COPY --from=builder /src/package-lock.json /app/package-lock.json

WORKDIR /app
RUN npm install -g pm2 && \
    chown -R node:node /app
USER node

ENTRYPOINT ["pm2-runtime", "/app/.output/server/index.mjs"]
