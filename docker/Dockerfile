FROM node:21.4.0-alpine as base

# Set environment variables for pnpm
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

# Enable corepack
RUN corepack enable

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

# Install pnpm
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

# Build the app
RUN pnpm run build

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

# Install pm2 globally
RUN pnpm install -g pm2

# Adjust permissions
RUN chmod -R 777 /app && \
    chown -R node:node /app

# Switch to the 'node' user
USER node

# Define the entrypoint command
ENTRYPOINT ["pm2-runtime", "/app/.output/server/index.mjs"]
