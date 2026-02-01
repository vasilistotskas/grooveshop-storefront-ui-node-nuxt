/**
 * Composable for generating product URLs
 *
 * Provides utility functions for creating SEO-friendly product URLs
 * with optional slug parameters for better readability and SEO.
 *
 * @example
 * ```ts
 * const { productUrl } = useProductUrl()
 *
 * // With product object
 * productUrl(product) // "/products/123/product-name"
 *
 * // With product ID only
 * productUrl(123) // "/products/123"
 *
 * // With custom slug
 * productUrl(product, 'custom-slug') // "/products/123/custom-slug"
 * ```
 */
export const useProductUrl = () => {
  /**
   * Generate a product URL from a product object or ID
   *
   * Creates SEO-friendly URLs with optional slug parameter.
   * Falls back to ID-only URL if no slug is available.
   *
   * @param productOrId - Product object or numeric product ID
   * @param slug - Optional custom slug to override product's slug
   * @returns Product URL path (e.g., "/products/123/product-name")
   */
  const productUrl = (productOrId: Product | number, slug?: string) => {
    if (typeof productOrId === 'number') {
      return `/products/${productOrId}`
    }

    const productSlug = slug || productOrId.slug || ''
    if (productSlug) {
      return `/products/${productOrId.id}/${productSlug}`
    }
    else {
      return `/products/${productOrId.id}`
    }
  }

  return {
    productUrl,
  }
}
