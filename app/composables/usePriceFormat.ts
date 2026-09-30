/**
 * Composable for formatting prices with currency and locale support
 *
 * Uses vue-i18n's `n` function for consistent number formatting
 * based on the numberFormats defined in i18n.config.mts
 *
 * Provides consistent price formatting across the application with:
 * - Locale-aware currency symbol
 * - Thousands separator
 * - Locale-aware formatting
 */

export function usePriceFormat() {
  const { $i18n } = useNuxtApp()
  const tenantStore = useTenantStore()

  /**
   * Resolve the active currency from the tenant config, with EUR as the
   * platform-wide fallback (matches the static format defined in
   * ``i18n.config.mts``). Reading from the store at format time lets a
   * non-EUR tenant render prices in its own currency without forking
   * the i18n config (M8 in MULTI_TENANT_AUDIT.md).
   */
  const currency = computed(() => tenantStore.defaultCurrency || 'EUR')

  /**
   * Format a price value with currency symbol and thousands separator
   * Uses an inline ``{ style: 'currency', currency }`` override so each
   * tenant's configured currency is honoured.
   *
   * @param price - The price value to format
   * @returns Formatted price string with currency symbol
   *
   * @example
   * formatPrice(1234.56) // "1.234,56 €" (Greek locale, EUR)
   * formatPrice(1000) // "1.000,00 €"
   * formatPrice(50) // "50,00 €"
   */
  const formatPrice = (price: number | undefined): string => {
    return $i18n.n(price || 0, {
      style: 'currency',
      currency: currency.value,
      notation: 'standard',
    })
  }

  /**
   * Format a price value without currency symbol (for input fields)
   * Uses the 'decimal' format defined in i18n numberFormats
   *
   * @param price - The price value to format
   * @returns Formatted price string without currency (e.g., "1.234,56")
   *
   * @example
   * formatPriceValue(1234.56) // "1.234,56" (Greek locale)
   * formatPriceValue(1000) // "1.000,00"
   */
  const formatPriceValue = (price: number | undefined): string => {
    return $i18n.n(price || 0, 'decimal')
  }

  /**
   * Get the currency symbol for the current locale
   *
   * @returns Currency symbol (e.g., "€", "$", "£")
   */
  const getCurrencySymbol = (): string => {
    const formatted = $i18n.n(0, {
      style: 'currency',
      currency: currency.value,
      notation: 'standard',
    })
    return formatted.replace(/[\d\s.,]+/g, '').trim()
  }

  return {
    formatPrice,
    formatPriceValue,
    getCurrencySymbol,
  }
}
