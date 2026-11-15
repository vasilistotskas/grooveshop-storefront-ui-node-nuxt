import type { Ref } from 'vue'

/**
 * What a spotlighted product shows, whatever its look (`Product/Spotlight`
 * and `Product/SpotlightBold`): its name and page, the shopper's price with an
 * announced reduction's prior price, its stock, and the store's own way to buy
 * it (`resolvePart`): the add-to-cart button, or the restock alert (alerts on)
 * when it is sold out. The store's `cart` feature and `showAddToCart` decide
 * the button.
 */
export function useProductSpotlight(
  product: Ref<ProductCard>,
  showAddToCart: () => boolean,
  texts: { label: () => string, name: (name: string) => string },
) {
  const { locale } = useI18n({ useScope: 'global' })
  const localePath = useLocalePath()
  const { productUrl } = useUrls()
  const tenantStore = useTenantStore()
  const cartEnabled = useStoreFeature('cart')
  const productAlertsEnabled = useStoreFeature('productAlerts')

  const productId = computed(() => product.value.id)

  const { displayFinalPrice, wasPrice, announcement } = useShopperPrice(productId, product)

  const name = computed(() => extractTranslated(product.value, 'name', locale.value) ?? '')
  const to = computed(() => localePath({ path: productUrl(product.value.id, product.value.slug) }))
  const soldOut = computed(() => (product.value.stock ?? 0) <= 0)
  const lowStockCount = computed(() => lowStockLeft(product.value))

  const partInput = computed<DesignPartInput>(() => ({
    product: product.value,
    name: name.value,
    addToCartLabel: texts.label(),
    addToCartName: texts.name(name.value),
  }))

  const buy = computed(() => {
    if (soldOut.value) {
      return productAlertsEnabled.value ? resolvePart('product_restock_alert', tenantStore.schemaName) : null
    }
    return cartEnabled.value && showAddToCart() ? resolvePart('product_add_to_cart', tenantStore.schemaName) : null
  })

  return { name, to, soldOut, lowStockCount, displayFinalPrice, wasPrice, announcement, partInput, buy }
}
