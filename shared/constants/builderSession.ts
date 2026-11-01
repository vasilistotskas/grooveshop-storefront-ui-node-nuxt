/**
 * The cookie that holds a staff member's page-builder session: their own
 * sealed, HttpOnly cookie, apart from the customer session
 * (`nuxt-session`, nuxt-auth-utils). The `__Host-` prefix makes a browser
 * refuse it unless it is Secure, set from this host, with no Domain and
 * `Path=/`, so a sibling subdomain cannot plant or shadow it.
 */
export const BUILDER_SESSION_COOKIE = '__Host-builder-session'
