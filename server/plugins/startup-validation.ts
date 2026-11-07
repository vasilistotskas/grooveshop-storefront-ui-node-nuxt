import { defineNitroPlugin } from 'nitropack/runtime'
import { useRuntimeConfig } from 'nuxt/server'

/**
 * Validates required environment variables at server startup.
 * Fails hard so misconfigured deployments are caught immediately.
 */
export default defineNitroPlugin(() => {
  const config = useRuntimeConfig()

  // nuxt-auth-utils and the builder session seal their cookies with keys
  // `nuxt/server` derives from `appSecret` (`deriveSecret` refuses a
  // missing or short one at the first request; this refuses it at boot).
  if (!config.appSecret || config.appSecret.length < 32) {
    throw new Error(
      '[startup] NUXT_APP_SECRET must be set, at least 32 characters. '
      + 'Generate one with: openssl rand -base64 32',
    )
  }

  // The backend origins decide which outgoing calls carry the visitor's
  // identity and the edge secret (`isInternalBackendUrl`). A value that
  // is not an absolute http(s) URL would silently match nothing — every
  // call reaching Django without its tenant host — so it stops the boot.
  // (`backend:8000` parses, as a URL whose SCHEME is `backend:`.)
  for (const [name, value] of [
    ['NUXT_API_BASE_URL', config.apiBaseUrl],
    ['NUXT_DJANGO_URL', config.djangoUrl],
  ] as const) {
    const protocol = typeof value === 'string' ? URL.parse(value)?.protocol : undefined
    if (protocol !== 'http:' && protocol !== 'https:') {
      throw new Error(`[startup] ${name} must be an absolute http(s) URL, got ${JSON.stringify(value ?? '')}.`)
    }
  }
})
