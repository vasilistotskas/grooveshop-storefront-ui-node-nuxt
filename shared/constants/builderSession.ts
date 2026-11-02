/**
 * The cookie that holds a staff member's page-builder session: their own
 * sealed, HttpOnly cookie, apart from the customer session
 * (`nuxt-session`, nuxt-auth-utils). The `__Host-` prefix makes a browser
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
 * What a staff member is in this store, as the staff session states it
 * (Django: `TenantMembershipRole`, plus `superuser` for a platform
 * superuser, who holds no membership; `builder/staff_session.py`).
 */
export const BUILDER_STAFF_ROLES = ['staff', 'admin', 'owner', 'superuser'] as const

/**
 * The roles that edit, publish and schedule. STAFF may open the editor to
 * look (owner, 2026-11-02): Django refuses their writes either way, and the
 * editor shows them everything read-only.
 */
export const BUILDER_EDITING_ROLES: readonly (typeof BUILDER_STAFF_ROLES)[number][] = ['admin', 'owner', 'superuser']
