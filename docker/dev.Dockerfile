FROM node:21.0.0-alpine as construction

# Create user and group
RUN addgroup groove && adduser -S -G groove groove

# Set working directory
WORKDIR /frontend

# Copy package files and the rest of the application
COPY package*.json ./
COPY . .

# Change ownership of /frontend and all its contents to groove user
RUN chown -R groove:groove /frontend

# Switch to non-root user
USER groove

# Install dependencies
RUN npm install && npm cache clean --force

EXPOSE 3000

ENV NUXT_HOST=0.0.0.0
ENV NUXT_PORT=3000

CMD [ "npm", "run", "dev" ]
