---
paths:
  - ".github/**"
  - "docker/**"
---

# CI, Docker and releases

The GitHub Actions workflows, the Docker image and semantic-release. Versions are not written here: `ci.yml`, `docker/Dockerfile` and the `packageManager` field of `package.json` are the source of truth.

- **GitHub Actions CI** (`.github/workflows/ci.yml`): quality (TypeScript check, dependency audit) → test (unit+nuxt with coverage) → build (with a Redis service, .env from GitHub vars/secrets) → release (semantic-release on `main` push — versions, CHANGELOG, GitHub Release; **no npm publishing**). All steps use the Node version `ci.yml` pins and the pnpm in the `packageManager` field of `package.json`, with a frozen lockfile. A push to `main` whose tree a green pull_request run already tested (the branch was up to date with `main`) skips everything but Trivy and releases at once (`.github/scripts/tested_in_pr.sh`), except Build when `main` has no fonts cache for the tree (only Build saves the one the image build restores); merging a branch that is behind `main` costs a full second run. The image build (`docker.yml`) uses no BuildKit layer cache: it runs on a release tag, and no tag can read another tag's cache.
- **Docker publish** (`.github/workflows/docker.yml`): On GitHub release `published`, builds a multi-stage Docker image (Node Alpine; the version is in `docker/Dockerfile`) and pushes to Docker Hub (`gro0ve/grooveshop-storefront-ui-node-nuxt`) and GHCR. Uses Docker Buildx without a layer cache (see the CI note above).
- **Semantic release**: Conventional commits, auto-versioning, CHANGELOG generation, GitHub release with `.output` asset. Publishing to npm is disabled (`npmPublish: false`); the `@semantic-release/npm` plugin only bumps `package.json` version.
- **Docker** (`docker/Dockerfile`): Multi-stage build. Build stage installs deps with pnpm cache mount, prepares Nuxt, builds with `NODE_OPTIONS=--max-old-space-size=8192`. Production stage copies only `.output`, runs as non-root `node` user.
