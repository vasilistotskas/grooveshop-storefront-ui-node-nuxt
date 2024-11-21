# Stage 1: Builder
FROM node:23.2.0-alpine AS base

# Install git if your build process requires it
RUN apk add --no-cache git

# Set up the work directory
WORKDIR /app

# Adjust permissions
RUN chmod -R 777 /app && \
    chown -R node:node /app

# Copy all files
COPY . .

# Configure Git safe directory (if necessary)
RUN git config --global --add safe.directory /app

# Set build-time environment variables
ENV GENERATE_SOURCEMAP=false \
    NODE_OPTIONS="--max-old-space-size=8192"

# Remove existing node_modules, nuxt, and output directories
RUN rm -rf ./node_modules && \
    rm -rf ./nuxt && \
    rm -rf ./output

FROM base AS build

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

# Install npm && build the app
RUN npm ci && \
    npm run build

FROM base

# Set up the work directory
WORKDIR /app

# Copy necessary files from the build stage
COPY --from=build /app/node_modules /app/node_modules
COPY --from=build /app/.output ./.output
COPY --from=build /app/.nuxt ./.nuxt
COPY --from=build /app/package*.json ./

# Adjust permissions
RUN chmod -R 777 /app && \
    chown -R node:node /app

# Switch to the 'node' user
USER node

# Define the entrypoint command
ENTRYPOINT ["node", ".output/server/index.mjs"]
