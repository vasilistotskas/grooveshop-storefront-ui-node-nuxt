FROM node:21.1.0-alpine as development

COPY ./grooveshop-storefront-ui-node-nuxt/docker/docker_entrypoint.sh /app/docker_entrypoint.sh
RUN sed -i 's/\r$//g' /app/docker_entrypoint.sh
RUN chmod +x /app/docker_entrypoint.sh

VOLUME /mnt/app

WORKDIR /mnt/app

# Designated to tell Nuxt to resolve a host address (Nuxt3 Docs)
ENV HOST 0.0.0.0
ENV PORT 3000

ENTRYPOINT ["/app/docker_entrypoint.sh"]
