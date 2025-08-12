/**
 * Composable for generating product URLs
 * Handles both full product objects and ID references
 */
export const useProductUrl = () => {
  const productUrl = (productOrId: Product | number, slug?: string) => {
    if (typeof productOrId === 'number') {
      // If we only have an ID, generate a basic URL
      return `/products/${productOrId}`
    }

    // If we have a full product object, use the slug if available
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
