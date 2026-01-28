/**
 * Composable for handling payment method translations and utilities
 */
export function usePaymentMethod() {
  const { $i18n } = useNuxtApp()

  /**
   * Get the translated name for a payment method based on its provider name
   * @param providerName - The payment provider name (e.g., 'PAY_ON_DELIVERY', 'STRIPE')
   * @returns Translated payment method name
   */
  const getPaymentMethodName = (providerName?: string | null): string => {
    if (!providerName) {
      return 'WTF'
    }

    // Map provider name to i18n key
    const key = `payment_methods.${providerName}`
    return $i18n.t(key)
  }

  return {
    getPaymentMethodName,
  }
}
