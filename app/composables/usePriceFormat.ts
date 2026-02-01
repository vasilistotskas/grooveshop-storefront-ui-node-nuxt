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

  /**
   * Format a price value with currency symbol and thousands separator
   * Uses the 'currency' format defined in i18n numberFormats
   *
   * @param price - The price value to format
   * @returns Formatted price string with currency symbol
   *
   * @example
   * formatPrice(1234.56) // "1.234,56 €" (Greek locale)
   * formatPrice(1000) // "1.000,00 €"
   * formatPrice(50) // "50,00 €"
   */
  const formatPrice = (price: number | undefined): string => {
    return $i18n.n(price || 0, 'currency')
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
    const formatted = $i18n.n(0, 'currency')
    return formatted.replace(/[\d\s.,]+/g, '').trim()
  }

  /**
   * Parse a formatted price string back to a number
   * Handles locale-specific formatting and various currency symbols
   *
   * @param formattedPrice - The formatted price string
   * @returns Parsed number value
   *
   * @example
   * parsePrice("1.234,56") // 1234.56
   * parsePrice("1.000 €") // 1000
   */
  const parsePrice = (formattedPrice: string): number => {
    // Remove currency symbols and spaces (supports multiple currencies)
    const cleaned = formattedPrice.replace(/[€$£¥₹₽¥₩\s]/g, '')
    // Handle Greek locale format (period as thousands separator, comma as decimal)
    // and English locale format (comma as thousands separator, period as decimal)
    const normalized = cleaned.replace(/[,.]/g, (match, offset, string) => {
      // If it's the last occurrence and followed by digits, it's a decimal separator
      const lastIndex = string.lastIndexOf(match)
      if (offset === lastIndex && string.slice(offset + 1).length <= 2) {
        return '.'
      }
      return ''
    })
    return Number.parseFloat(normalized) || 0
  }

  return {
    formatPrice,
    formatPriceValue,
    getCurrencySymbol,
    parsePrice,
  }
}
