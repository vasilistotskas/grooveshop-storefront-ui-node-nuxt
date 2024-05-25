# Grooveshop Nuxt Frontend

## Overview

This repository contains the Nuxt frontend application designed to interact with a Django REST API backend. The
application is structured to provide a dynamic and responsive user interface, leveraging the capabilities of Nuxt for
server-side rendering and improved SEO. The frontend communicates with the Django backend to manage user interactions,
data retrieval, and other functionalities.

## Features

- **Server-Side Rendering (SSR)**: Utilizes Nuxt for rendering pages on the server, enhancing load times and SEO.
- **Dynamic User Interfaces**: Implements reactive components for real-time user experience adjustments.
- **Authentication**: Manages user authentication sessions using the Django API.
- **API Communication**: Uses H3 and fetch to communicate with the Django backend.

## Project Structure

- **assets**: Static resources like stylesheets and images.
- **components**: Vue components used throughout the application.
- **composables**: Composition API functions.
- **config**: Configuration files for the Nuxt project.
- **constants**: Constants used across the application.
- **content**: Markdown or static content used in the application.
- **docker**: Dockerfiles and related configurations for containerization.
- **events**: Event handling scripts.
- **layouts**: Vue layout templates.
- **locales**: Localization files for internationalization support.
- **middleware**: Nuxt middleware for handling SSR logic.
- **modules**: Custom Nuxt modules.
- **pages**: Nuxt pages directory containing Vue components for routing.
- **plugins**: Plugins used in the Nuxt project.
- **providers**: Services that abstract API communications.
- **public**: Public directory for static files.
- **runtime**: Custom runtime configurations.
- **server**: Server-side scripts and API endpoint integrations.
- **service-worker**: PWA service worker configurations.
- **stores**: Pinia store modules.
- **tests**: Unit and integration tests.
- **tools**: Utility and helper scripts.
- **types**: TypeScript definitions and interfaces.
- **utils**: Utility functions used throughout the application.

## Setup

### Prerequisites

- Node.js 20.x or higher
- Nuxt 3.10.x or higher
- Docker (optional, for containerization)

## License

This project is open-sourced under the MIT License. See the [LICENSE](LICENSE.md) file for more details.
