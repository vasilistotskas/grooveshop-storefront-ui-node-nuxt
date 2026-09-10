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
      const primaryDomain = tenant.value?.primaryDomain
      if (primaryDomain) {
        const i18nConfig = (useRuntimeConfig().public as {
          i18n?: { baseUrl?: string }
        }).i18n
        if (i18nConfig) {
          i18nConfig.baseUrl = `https://${primaryDomain}`
        }
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
