# Stage 1: Builder
FROM node:23.2.0-alpine AS builder

# Install git if your build process requires it
RUN apk add --no-cache git

# Set working directory
WORKDIR /app

# Copy package files first to leverage Docker caching
COPY package*.json ./

# Install all dependencies
RUN npm ci

# Copy the rest of the application source code
COPY . .

# Configure Git safe directory (if necessary)
RUN git config --global --add safe.directory /app

# Set build-time environment variables
ENV GENERATE_SOURCEMAP=false \
    NODE_OPTIONS="--max-old-space-size=8192"

# Build the Nuxt application
RUN npm run build

# Stage 2: Production
FROM node:23.2.0-alpine AS production

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

# Set working directory
WORKDIR /app

# Copy built application from the builder stage
COPY --from=builder /app/.output ./.output
COPY --from=builder /app/package*.json ./

# Install only production dependencies
RUN npm ci --only=production

# Use the non-root 'node' user provided by the base image
USER node

# Expose the application port
EXPOSE 3000

# Define the entrypoint command
CMD ["node", ".output/server/index.mjs"]
