export default defineNuxtPlugin({
  name: 'tenant',
  enforce: 'pre',
  async setup() {
    const tenant = useState<TenantConfig | null>('tenant', () => null)
    if (import.meta.server) {
      const event = useRequestEvent()
      tenant.value = event?.context?.tenant ?? null
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
