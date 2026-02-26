/**
 * Validates required environment variables at server startup.
 * Fails hard so misconfigured deployments are caught immediately.
 */
export default defineNitroPlugin(() => {
  const config = useRuntimeConfig()

  if (!config.session?.password) {
    throw new Error(
      '[startup] NUXT_SESSION_PASSWORD is not set. '
      + 'Session encryption requires a strong secret. '
      + 'Generate one with: openssl rand -base64 32',
    )
  }

  if (config.session.password.length < 32) {
    throw new Error(
      '[startup] NUXT_SESSION_PASSWORD must be at least 32 characters long.',
    )
  }

  if (!config.secretKey) {
    throw new Error(
      '[startup] NUXT_SECRET_KEY is not set. '
      + 'This is required for encrypted token handling.',
    )
  }
})
