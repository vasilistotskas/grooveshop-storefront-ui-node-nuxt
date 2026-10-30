import type { RequestEventContext } from '@nuxt/schema'
import type { AuditableLogger } from 'evlog'
import type { SupportedLocale } from '~~/i18n/locales'
import type { TenantConfig } from '~~/shared/openapi/types.gen'
import type { TenantResult } from '~~/shared/types/TenantResult'

/**
 * What this app's server middleware and the evlog plugin put on every
 * request's context. Shared, because both sides read it: the server code
 * and the app's SSR plugins (`app/plugins/tenant.ts`). A module
 * augmentation outside a type context is silently ignored there.
 *
 * Declared once, on Nuxt's portable `RequestEventContext`, and h3's
 * context extends it: Nitro 2 hands plugins and cache callbacks h3's own
 * event, and the helpers that read only the context (`requestTenantHost`,
 * `requestLocale`, `tenantCacheKey`) serve both events with one type.
 */
declare module '@nuxt/schema' {
  interface RequestEventContext {
    /** The store's host, as `tenantHostOf` names it: `server/middleware/0.tenant.ts`, on every request. */
    tenantHost?: string
    /** The store this request is for: `server/middleware/0.tenant.ts`. Absent on its bypass paths (probes, sitemap, prerender). */
    tenant?: TenantConfig
    /** The one lookup of this request's store, shared by every caller: `requestTenantResult`. */
    tenantResult?: Promise<TenantResult>
    /** The locale this request renders in: `server/middleware/1.locale.ts`. */
    locale?: SupportedLocale
    /** The CSP nonce for this response: `server/middleware/3.csp.ts`. */
    cspNonce?: string
    /**
     * Set by an SSR plugin that had to render with a fallback (the
     * store's texts could not be loaded): the response must be kept out
     * of every cache. `status` is the one to answer with, see
     * `shared/constants/degradedRender.ts`.
     */
    degradedRender?: { status: number }
    /** The request's wide-event logger, put here by the evlog Nitro plugin. */
    log?: AuditableLogger
  }
}

declare module 'h3' {
  interface H3EventContext extends RequestEventContext {}
}

export {}
