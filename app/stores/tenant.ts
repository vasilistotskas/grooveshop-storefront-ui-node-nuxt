import type { TenantConfig } from '~~/server/utils/tenant'

export const useTenantStore = defineStore('tenant', () => {
  const config = ref<TenantConfig | null>(null)

  const storeName = computed(() => config.value?.storeName ?? '')
  const primaryDomain = computed(() => config.value?.primaryDomain ?? '')
  const primaryColor = computed(() => config.value?.primaryColor ?? 'neutral')
  const neutralColor = computed(() => config.value?.neutralColor ?? 'zinc')
  const accentHex = computed(() => config.value?.accentHex ?? '#003DFF')
  const logoLightUrl = computed(() => config.value?.logoLightUrl ?? '')
  const logoDarkUrl = computed(() => config.value?.logoDarkUrl ?? '')
  const faviconUrl = computed(() => config.value?.faviconUrl ?? '')
  const loyaltyEnabled = computed(() => config.value?.loyaltyEnabled ?? false)
  const blogEnabled = computed(() => config.value?.blogEnabled ?? true)
  const plan = computed(() => config.value?.plan ?? 'trial')
  const themePreset = computed(() => config.value?.themePreset ?? 'default')

  function setConfig(tenantConfig: TenantConfig | null) {
    config.value = tenantConfig
  }

  return {
    config,
    storeName,
    primaryDomain,
    primaryColor,
    neutralColor,
    accentHex,
    logoLightUrl,
    logoDarkUrl,
    faviconUrl,
    loyaltyEnabled,
    blogEnabled,
    plan,
    themePreset,
    setConfig,
  }
})
