FROM node:22.8.0-alpine as base

# Set up the work directory
WORKDIR /app

# Adjust permissions
RUN chmod -R 777 /app && \
    chown -R node:node /app

# Copy all files
COPY ./ ./

# Set environment variables
ENV GENERATE_SOURCEMAP=false
ENV NODE_OPTIONS="--max-old-space-size=8192"

# Remove existing node_modules, nuxt, and output directories
RUN rm -rf ./node_modules && \
    rm -rf ./nuxt && \
    rm -rf ./output

# Install git, configure safe directory
RUN apk add --no-cache git && \
    git config --global --add safe.directory /app

FROM base AS build

# Set environment variables
ENV NUXT_PUBLIC_APP_TITLE="Webside - Το side της τεχνολογίας"
ENV NUXT_PUBLIC_SITE_DESCRIPTION="Μπες στο side της τεχνολογίας, εύκολα, δωρεάν και με ασφάλεια."
ENV NUXT_PUBLIC_APP_LOGO="https://webside.gr/img/logo.png"
ENV NUXT_PUBLIC_BASE_URL="https://webside.gr"
ENV NUXT_PUBLIC_SITE_URL="https://webside.gr"
ENV NUXT_PUBLIC_SITE_NAME="Webside"
ENV NUXT_PUBLIC_MEDIA_STREAM_ORIGIN="https://assets.webside.gr"

# Install npm && build the app
RUN npm ci && \
    npm run build

FROM base

# Set environment variables
ENV NUXT_HOST 0.0.0.0
ENV NUXT_PORT 3000
ENV NODE_ENV production

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
