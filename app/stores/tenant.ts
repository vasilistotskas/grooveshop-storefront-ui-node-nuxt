export const useTenantStore = defineStore('tenant', () => {
  const config = ref<TenantConfig | null>(null)

  const schemaName = computed(() => config.value?.schemaName ?? '')
  const storeName = computed(() => config.value?.storeName ?? '')
  const storeDescription = computed(() => config.value?.storeDescription ?? '')
  const primaryDomain = computed(() => config.value?.primaryDomain ?? '')
  const apiDomain = computed(() => config.value?.apiDomain ?? '')
  const assetsDomain = computed(() => config.value?.assetsDomain ?? '')
  const staticDomain = computed(() => config.value?.staticDomain ?? '')
  const primaryColor = computed(() => config.value?.primaryColor ?? 'neutral')
  const neutralColor = computed(() => config.value?.neutralColor ?? 'zinc')
  const accentHex = computed(() => config.value?.accentHex ?? '#003DFF')
  const logoLightUrl = computed(() => config.value?.logoLightUrl ?? '')
  const logoDarkUrl = computed(() => config.value?.logoDarkUrl ?? '')
  const faviconUrl = computed(() => config.value?.faviconUrl ?? '')
  const defaultLocale = computed(() => config.value?.defaultLocale ?? '')
  const defaultCurrency = computed(() => config.value?.defaultCurrency ?? 'EUR')
  const loyaltyEnabled = computed(() => config.value?.loyaltyEnabled ?? false)
  const blogEnabled = computed(() => config.value?.blogEnabled ?? true)
  const promotionsEnabled = computed(() => config.value?.promotionsEnabled ?? false)
  const giftCardsEnabled = computed(() => config.value?.giftCardsEnabled ?? false)
  const b2bEnabled = computed(() => config.value?.b2bEnabled ?? false)
  const themePreset = computed(() => config.value?.themePreset ?? 'default')
  const stripePublishableKey = computed(() => config.value?.stripePublishableKey ?? '')

  // Analytics & tracking — empty string means "use platform fallback"
  const metaPixelId = computed(() => config.value?.metaPixelId ?? '')
  const tiktokPixelId = computed(() => config.value?.tiktokPixelId ?? '')
  const gaTrackingId = computed(() => config.value?.gaTrackingId ?? '')

  // MFA — empty string means Django uses its own default issuer
  const totpIssuer = computed(() => config.value?.totpIssuer ?? '')

  // BoxNow delivery — tenant-only, no platform fallback. Empty string
  // means the tenant hasn't configured BoxNow (checkout hides the
  // locker-pickup option).
  const boxNowPartnerId = computed(() => config.value?.boxNowPartnerId ?? '')

  // Social links — each empty string means "use platform fallback"
  const socials = computed(() => ({
    discord: config.value?.socialsDiscord ?? '',
    facebook: config.value?.socialsFacebook ?? '',
    instagram: config.value?.socialsInstagram ?? '',
    pinterest: config.value?.socialsPinterest ?? '',
    reddit: config.value?.socialsReddit ?? '',
    tiktok: config.value?.socialsTiktok ?? '',
    twitter: config.value?.socialsTwitter ?? '',
    youtube: config.value?.socialsYoutube ?? '',
  }))

  function setConfig(tenantConfig: TenantConfig | null) {
    config.value = tenantConfig
  }

  return {
    config,
    schemaName,
    storeName,
    storeDescription,
    primaryDomain,
    apiDomain,
    assetsDomain,
    staticDomain,
    primaryColor,
    neutralColor,
    accentHex,
    logoLightUrl,
    logoDarkUrl,
    faviconUrl,
    defaultLocale,
    defaultCurrency,
    loyaltyEnabled,
    blogEnabled,
    promotionsEnabled,
    giftCardsEnabled,
    b2bEnabled,
    themePreset,
    stripePublishableKey,
    metaPixelId,
    tiktokPixelId,
    gaTrackingId,
    totpIssuer,
    boxNowPartnerId,
    socials,
    setConfig,
  }
})
