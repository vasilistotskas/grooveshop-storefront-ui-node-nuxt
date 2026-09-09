/**
 * Composable for handling payment method translations and utilities
 */
export function usePaymentMethod() {
  const { $i18n } = useNuxtApp()
  const t = $i18n.t.bind($i18n)

  /**
   * Get the translated name for a payment method based on its provider name
   * @param providerName - The payment provider name (e.g., 'PAY_ON_DELIVERY', 'STRIPE')
   * @returns Translated payment method name
   */
  const getPaymentMethodName = (providerName?: string | null): string => {
    if (!providerName) {
      return 'N/A'
    }

    // Map provider name to i18n key
    const key = `payment_methods.${providerName}`
    const translated = t(key)

    // vue-i18n returns the key PATH when a message is missing, so an
    // unmapped method would render `payment_methods.SOMETHING` at a
    // customer. This map lives in the storefront while the vocabulary
    // is seeded by Django migrations, so it will lag the day a new
    // method is added — falling back to the bare key is ugly but it is
    // not a leaked i18n path, and it keeps the row readable.
    return translated === key ? providerName : translated
  }

  return {
    getPaymentMethodName,
  }
}
