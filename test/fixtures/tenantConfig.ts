/**
 * A `TenantConfig` payload that satisfies the generated `zTenantConfig`.
 *
 * `server/middleware/0.tenant.ts` runs on EVERY request and validates the
 * upstream resolve response with `parseDataAs(response, zTenantConfig)`.
 * Any test that boots a real Nitro server therefore has to serve a
 * payload that passes that schema, or every request in the test 404s
 * with "Store not found" — a failure that names neither the schema nor
 * the field that broke it.
 *
 * Which is exactly what happened on 2026-08-27: `TenantConfig` gained a
 * required `agentPaymentInstruments`, the store spec's copy was updated
 * and this one was not, and the e2e suite went red with a 77-second
 * timeout and a 404. Kept here, in one place, with a unit test that
 * parses it through `zTenantConfig` so the next schema change fails in
 * milliseconds naming the missing field.
 */
export function validTenantConfig(domain: string) {
  return {
    schemaName: 'test',
    name: domain,
    storeName: domain,
    storeDescription: '',
    logoLightUrl: '',
    logoDarkUrl: '',
    faviconUrl: '',
    primaryColor: '',
    neutralColor: '',
    accentHex: '#000000',
    successHex: '#000000',
    warningHex: '#000000',
    errorHex: '#000000',
    infoHex: '#000000',
    themePreset: '',
    themeMetadata: {},
    defaultLocale: 'el',
    defaultCurrency: 'EUR',
    primaryDomain: domain,
    apiDomain: domain,
    assetsDomain: domain,
    staticDomain: domain,
    loyaltyEnabled: false,
    blogEnabled: false,
    promotionsEnabled: false,
    agentCommerceEnabled: true,
    agentPaymentInstruments: [],
    productFeedsEnabled: true,
    giftCardsEnabled: false,
    agentStripeDelegatedEnabled: false,
    stripePublishableKey: '',
    allowedCspSources: [],
    metaPixelId: '',
    tiktokPixelId: '',
    gaTrackingId: '',
    totpIssuer: '',
    socialsDiscord: '',
    socialsFacebook: '',
    socialsInstagram: '',
    socialsPinterest: '',
    socialsReddit: '',
    socialsTiktok: '',
    socialsTwitter: '',
    socialsYoutube: '',
    boxNowPartnerId: '',
  }
}
