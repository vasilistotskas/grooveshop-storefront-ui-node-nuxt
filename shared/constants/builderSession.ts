import type { StaffSessionRoleEnum } from '../openapi/types.gen'

/**
 * The cookie that holds a staff member's page-builder session: their own
 * sealed, HttpOnly cookie, apart from the customer session
 * (`nuxt-auth-session`, nuxt-auth-utils). The `__Host-` prefix makes a browser
 * refuse it unless it is Secure, set from this host, with no Domain and
 * `Path=/`, so a sibling subdomain cannot plant or shadow it.
 */
export const BUILDER_SESSION_COOKIE = '__Host-builder-session'

/**
 * The `Authorization` scheme of a builder staff token. Not `Bearer`: that
 * keyword belongs to Knox's customer tokens in Django, so a staff token
 * must never be read as one (`docs/api-staff-identity.md` in the Django repo).
 */
export const BUILDER_STAFF_AUTH_SCHEME = 'StaffBearer'

/**
 * The roles that edit, publish and schedule. STAFF may open the editor to
 * look (owner, 2026-11-02): Django refuses their writes either way, and the
 * editor shows them everything read-only.
 */
export const BUILDER_EDITING_ROLES: readonly StaffSessionRoleEnum[] = ['admin', 'owner', 'superuser']
