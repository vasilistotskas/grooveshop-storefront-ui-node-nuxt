/**
 * A product's images, under ONE key for every reader: the product page's
 * data (`useProductDetail`) and each drawing of its gallery
 * (`Product/Images.vue` and the tenants' own). Readers of one key pass
 * identical options, so the gallery joins the page's request instead of
 * asking again.
 */
export function useProductImages(productId: number) {
  const { locale } = useNuxtApp().$i18n

  return useApi(
    `/api/products/${productId}/images`,
    {
      key: `productImages${productId}`,
      method: 'GET',
      headers: useRequestHeaders(),
      query: {
        languageCode: locale,
      },
    },
  )
}
