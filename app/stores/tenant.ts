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
  // Locales this tenant serves. The API returns [] for a
  // single-language store, which is the default — normalise that to
  // just the default locale so consumers never special-case empty.
  // i18n routes exist for every platform locale regardless (build
  // time); this list is what makes one REACHABLE. See
  // middleware/locale-available.global.ts.
  const availableLocales = computed<string[]>(() =>
    config.value ? tenantAllowedLocales(config.value) : [],
  )
  const isMultilingual = computed(() => availableLocales.value.length > 1)
  const defaultCurrency = computed(() => config.value?.defaultCurrency ?? 'EUR')
  const loyaltyEnabled = computed(() => config.value?.loyaltyEnabled ?? false)
  const blogEnabled = computed(() => config.value?.blogEnabled ?? true)
  const promotionsEnabled = computed(() => config.value?.promotionsEnabled ?? false)
  const giftCardsEnabled = computed(() => config.value?.giftCardsEnabled ?? false)
  const b2bEnabled = computed(() => config.value?.b2bEnabled ?? false)
  // Plan tier of the two-tier gate; the runtime half is the
  // PRODUCT_SUGGESTIONS_ENABLED setting read where a strip is mounted.
  const recommendationsEnabled = computed(() => config.value?.recommendationsEnabled ?? false)
  const themePreset = computed(() => config.value?.themePreset ?? 'default')
  const stripePublishableKey = computed(() => config.value?.stripePublishableKey ?? '')

  // Analytics & tracking — empty string means "use platform fallback"
  const metaPixelId = computed(() => config.value?.metaPixelId ?? '')
  const tiktokPixelId = computed(() => config.value?.tiktokPixelId ?? '')
  const openaiPixelId = computed(() => config.value?.openaiPixelId ?? '')
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
    linkedin: config.value?.socialsLinkedin ?? '',
    pinterest: config.value?.socialsPinterest ?? '',
    reddit: config.value?.socialsReddit ?? '',
    tiktok: config.value?.socialsTiktok ?? '',
    twitter: config.value?.socialsTwitter ?? '',
    youtube: config.value?.socialsYoutube ?? '',
  }))

  // The platform's own storefront — the ONE store that renders the brand
  // assets bundled in this image (``Tenant.is_platform_storefront``, a
  // row flag; never a hostname compared on the client). An absent
  // config (probes, prerender, the error page of an unknown host)
  // counts as platform so those surfaces keep the bundled brand.
  const isPlatform = computed(() =>
    config.value ? (config.value.isPlatformStorefront ?? false) : true,
  )

  // SEO attribution — per-store data, emitted only where set.
  const seoAuthor = computed(() => config.value?.seoAuthor ?? '')
  const googleSiteVerification = computed(() => config.value?.googleSiteVerification ?? '')
  const pinterestDomainVerify = computed(() => config.value?.pinterestDomainVerify ?? '')

  function setConfig(tenantConfig: TenantConfig | null) {
    config.value = tenantConfig
  }

  return {
    config,
    isPlatform,
    seoAuthor,
    googleSiteVerification,
    pinterestDomainVerify,
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
    availableLocales,
    isMultilingual,
    defaultCurrency,
    loyaltyEnabled,
    blogEnabled,
    promotionsEnabled,
    giftCardsEnabled,
    b2bEnabled,
    recommendationsEnabled,
    themePreset,
    stripePublishableKey,
    metaPixelId,
    tiktokPixelId,
    openaiPixelId,
    gaTrackingId,
    totpIssuer,
    boxNowPartnerId,
    socials,
    setConfig,
  }
})
