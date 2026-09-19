export default defineNuxtPlugin({
  name: 'tenant',
  enforce: 'pre',
  async setup() {
    const tenant = useState<TenantConfig | null>('tenant', () => null)
    if (import.meta.server) {
      const event = useRequestEvent()
      tenant.value = event?.context?.tenant ?? null

      // i18n's baseUrl is platform-static in the built config (see the
      // NOTE in nuxt.config.ts), which made every non-platform tenant
      // log nuxt-site-config's "I18n baseUrl doesn't match your site
      // url" error on each request. Nitro clones runtimeConfig PER
      // EVENT (event.context.nitro.runtimeConfig) and hands that clone
      // to the Nuxt app AND to the serialized window.__NUXT__.config,
      // so rewriting the clone here — before @nuxtjs/i18n's plugin
      // reads it — is race-free and fixes SSR and client in one place.
      // Same ``https://`` derivation as 4.tenant-site-config.ts: the
      // two values must compare EQUAL host-for-host.
      const i18nConfig = (useRuntimeConfig().public as {
        i18n?: {
          baseUrl?: string
          defaultLocale?: string
          detectBrowserLanguage?: false | Record<string, unknown>
        }
      }).i18n

      const primaryDomain = tenant.value?.primaryDomain
      if (i18nConfig && primaryDomain) {
        i18nConfig.baseUrl = `https://${primaryDomain}`
      }

      // A store that sells in ONE language must not run i18n's browser
      // detection. Detection matches `navigator.languages` against the
      // BUILD-TIME locale list (`normalizedLocales` from
      // `#build/i18n-options.mjs`), not against anything per-tenant, so
      // on an English-preferring browser it resolved `en` and — with
      // `redirectOn: 'root'` — redirected `/` to `/en`, which
      // `locale-available.global.ts` 404s. Every visitor whose browser
      // asks for a language the store does not serve met an error page
      // instead of the homepage, on the tenant's OWN default locale.
      // `server/middleware/1.locale.ts` clamps its own
      // `event.context.locale` but has no say over the module.
      //
      // `useI18nDetection` reads `detectBrowserLanguage` off
      // `public.i18n` and reports `enabled: !!detectBrowserLanguage`
      // (@nuxtjs/i18n 10.6 `src/runtime/shared/utils.ts`), so clearing
      // it on the per-event clone switches detection off for SSR and
      // for the serialized client config at once — the same mechanism,
      // and the same race-free window, as `baseUrl` above.
      //
      // Which tenants keep it is `tenantDetectsBrowserLocale`, beside
      // the allow-list every other layer reads.
      if (
        i18nConfig?.detectBrowserLanguage
        && !tenantDetectsBrowserLocale(tenant.value, i18nConfig.defaultLocale)
      ) {
        i18nConfig.detectBrowserLanguage = false
      }
    }
  },
  hooks: {
    'app:created'() {
      // Hydrate the Pinia store after Pinia is installed
      const tenant = useState<TenantConfig | null>('tenant')
      const tenantStore = useTenantStore()
      tenantStore.setConfig(tenant.value)
    },
  },
})
