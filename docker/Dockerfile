ARG NODE_VERSION=24.19.0

FROM node:${NODE_VERSION}-alpine AS build

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN apk add --no-cache python3 make g++

RUN npm install -g pnpm@latest

WORKDIR /app

# ``scripts/`` ships alongside the manifests because pnpm runs the
# ``prepare`` lifecycle script during ``install``, and ``prepare`` now
# starts with ``node scripts/check-lockstep-deps.mjs``. Without it the
# install dies with "Cannot find module
# '/app/scripts/check-lockstep-deps.mjs'" — which is exactly what broke
# the v3.186.0 image publish, leaving a GitHub release with no image
# behind it. 32KB that changes rarely, so the layer cache barely cares.
#
# ``patches/`` for the same reason: ``pnpm-workspace.yaml`` lists
# ``patchedDependencies``, and pnpm reads every patch file before it
# installs anything — the v3.205.0 publish died on "Failed to read patch
# file /app/patches/reka-ui@2.10.4.patch".
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY scripts ./scripts
COPY patches ./patches

RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile --prefer-offline

COPY . .

RUN pnpm prepare

# The network-family attempt timeout: @nuxt/fonts fetches from Google
# during the build, and Node's happy-eyeballs gives each address 250 ms
# by default; from a slow builder every attempt expired
# (`AggregateError [ETIMEDOUT]` in internalConnectMultiple) and failed
# the build. Same value as ci.yml's Build.
ENV NODE_ENV=production \
    NUXT_HOST=0.0.0.0 \
    NUXT_PORT=3000 \
    NODE_OPTIONS="--max-old-space-size=8192 --network-family-autoselection-attempt-timeout=2000" \
    NUXT_CACHE_BASE=memory

# The same guard CI runs, against THIS context: `.dockerignore` decides
# what Tailwind's source detection sees here, and that is where the
# two-stylesheet build came from (scripts/check-build-output.mjs).
RUN pnpm run build && pnpm run check:build

FROM node:${NODE_VERSION}-alpine AS production

ENV NODE_ENV=production

WORKDIR /app

COPY --from=build --chown=node:node /app/.output .
# The post-deploy cache warm-up, run by the infrastructure's PostSync hook
# from THIS image so it warms the build it belongs to (it reads
# public/_nuxt/builds/latest.json next to it).
COPY --from=build --chown=node:node /app/scripts/warm-cache.mjs ./scripts/warm-cache.mjs
# The route lists it imports (`hasExtractedPayload`) and their imports, at
# the paths the script names; Node runs them as TypeScript.
# `test/unit/scripts/warm-cache-image.spec.ts` fails if one is missing.
COPY --from=build --chown=node:node /app/shared/constants/prerender.ts ./shared/constants/prerender.ts
COPY --from=build --chown=node:node /app/shared/i18n/localeFromPath.ts ./shared/i18n/localeFromPath.ts
COPY --from=build --chown=node:node /app/shared/utils/customPageSlug.ts ./shared/utils/customPageSlug.ts
COPY --from=build --chown=node:node /app/shared/utils/staticLayoutRoutes.ts ./shared/utils/staticLayoutRoutes.ts
COPY --from=build --chown=node:node /app/i18n/locales.ts ./i18n/locales.ts

USER node

EXPOSE 3000

ENTRYPOINT ["node", "server/index.mjs"]
