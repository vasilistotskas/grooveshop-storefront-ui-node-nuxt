/**
 * The store's description for `locale`.
 *
 * `storeDescription` is the default locale's text and `storeDescriptionI18n`
 * holds the other locales' (never the default). A locale with no entry, or
 * a blank one, gets the default text — the same fallback `authPanelTagline`
 * applies to the auth panel's line.
 */
export function localizedStoreDescription(
  tenant: { storeDescription: string, storeDescriptionI18n?: Record<string, string> },
  locale: string,
): string {
  return tenant.storeDescriptionI18n?.[locale] || tenant.storeDescription
}
