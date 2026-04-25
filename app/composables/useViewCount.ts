/**
 * Composable for tracking view counts on products and blog posts
 *
 * Client-side only, fire-and-forget: fires a POST and logs any error.
 *
 * @example
 * ```vue
 * <script setup>
 * const { trackView } = useViewCount()
 * trackView('product', productId)
 * trackView('blog', blogPostId)
 * </script>
 * ```
 */
export const useViewCount = () => {
  /**
   * Track a view for a product or blog post (client-side only, fire-and-forget).
   *
   * @param entityType - 'product' or 'blog'
   * @param entityId - ID of the entity to track
   */
  const trackView = (entityType: 'product' | 'blog', entityId: number) => {
    // Determine the API endpoint based on entity type
    const endpoint = entityType === 'product'
      ? `/api/products/${entityId}/update-view-count`
      : `/api/blog/posts/${entityId}/update-view-count`

    if (import.meta.client) {
      $fetch(endpoint, { method: 'POST' }).catch(error =>
        log.error({ action: `viewCount:${entityType}`, error }),
      )
    }
  }

  return {
    trackView,
  }
}
