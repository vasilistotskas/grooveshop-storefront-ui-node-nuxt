/**
 * Helper functions for generating URLs since absoluteUrl properties are no longer available
 */

export function useUrlHelpers() {
  const localePath = useLocalePath()

  const productUrl = (id: number, slug?: string) => {
    return localePath({ name: 'products-id-slug', params: { id, slug: slug || 'product' } })
  }

  const blogPostUrl = (id: number, slug?: string) => {
    return localePath({ name: 'blog-post-id-slug', params: { id, slug: slug || 'post' } })
  }

  const blogCategoryUrl = (id: number, slug?: string) => {
    return localePath({ name: 'blog-category-id-slug', params: { id, slug: slug || 'category' } })
  }

  const orderUrl = (id: number) => {
    return localePath({ name: 'account-orders-id', params: { id } })
  }

  return {
    productUrl,
    blogPostUrl,
    blogCategoryUrl,
    orderUrl,
  }
}
