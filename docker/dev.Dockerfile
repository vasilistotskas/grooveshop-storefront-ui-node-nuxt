FROM node:21.6.1-alpine as development

# Copy the entrypoint script into the container
COPY ./grooveshop-storefront-ui-node-nuxt/docker/docker_entrypoint.sh /app/docker_entrypoint.sh

# Fix potential Windows line endings and make the script executable
RUN sed -i 's/\r$//g' /app/docker_entrypoint.sh
RUN chmod +x /app/docker_entrypoint.sh

# Specify the volume for persistent storage
VOLUME /mnt/app

# Set the working directory
WORKDIR /mnt/app

# Designated to tell Nuxt to resolve a host address (Nuxt3 Docs)
ENV HOST 0.0.0.0
ENV PORT 3000
ENV NUXT_TELEMETRY_DISABLED 1
ENV CHOKIDAR_USEPOLLING 1

# Specify the entrypoint script
ENTRYPOINT ["/app/docker_entrypoint.sh"]
