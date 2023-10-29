FROM node:21.0.0-alpine as development

COPY ./grooveshop-storefront-ui-node-nuxt/docker/docker_entrypoint.sh /app/docker_entrypoint.sh
RUN sed -i 's/\r$//g' /app/docker_entrypoint.sh
RUN chmod +x /app/docker_entrypoint.sh

RUN mkdir -p /mnt/app && \
    chmod 777 -R /mnt/app && \
    chown -R node:node /mnt/app

VOLUME /mnt/app

WORKDIR /mnt/app

USER node

# Designated to tell Nuxt to resolve a host address (Nuxt3 Docs)
ENV HOST 0.0.0.0
ENV PORT 3000

ENTRYPOINT ["/app/docker_entrypoint.sh"]
