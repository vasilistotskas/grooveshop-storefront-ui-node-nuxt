import type { SupportedLocale } from '~~/i18n/locales'
import type { TenantConfig } from '~~/shared/openapi/types.gen'

/**
 * What this app's server middleware puts on every request's context.
 * Shared, because both sides read it: the Nitro middleware and routes,
 * and the app's SSR plugins (`app/plugins/tenant.ts`). A module
 * augmentation outside a type context is silently ignored there.
 */
declare module 'h3' {
  interface H3EventContext {
    /** The store this request is for: `server/middleware/0.tenant.ts`. Absent on its bypass paths (probes, sitemap, prerender). */
    tenant?: TenantConfig
    /** The locale this request renders in: `server/middleware/1.locale.ts`. */
    locale?: SupportedLocale
    /** The CSP nonce for this response: `server/middleware/3.csp.ts`. */
    cspNonce?: string
  }
}

export {}
