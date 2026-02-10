/**
 * Composable for tracking view counts on products and blog posts
 *
 * This composable provides a client-side only, fire-and-forget mechanism
 * for tracking views. It uses useAsyncData with immediate: false to allow
 * manual triggering after component mount.
 *
 * @example
 * ```vue
 * <script setup>
 * const { trackView } = useViewCount()
 *
 * // Track product view
 * trackView('product', productId)
 *
 * // Track blog post view
 * trackView('blog', blogPostId)
 * </script>
 * ```
 */
export const useViewCount = () => {
  /**
   * Track a view for a product or blog post
   *
   * This is a client-side only operation that fires a POST request
   * to update the view count. It's fire-and-forget - errors are logged
   * but don't affect the user experience.
   *
   * @param entityType - Type of entity ('product' or 'blog')
   * @param entityId - ID of the entity to track
   */
  const trackView = (entityType: 'product' | 'blog', entityId: number) => {
    // Determine the API endpoint based on entity type
    const endpoint = entityType === 'product'
      ? `/api/products/${entityId}/update-view-count`
      : `/api/blog/posts/${entityId}/update-view-count`

    // Use useAsyncData with immediate: false for manual triggering
    const { execute } = useAsyncData(
      `view-count:${entityType}:${entityId}`,
      () => $fetch(endpoint, {
        method: 'POST',
      }),
      {
        server: false, // Client-only - don't run on SSR
        immediate: false, // Don't execute automatically
        lazy: true, // Don't block navigation
      },
    )

    // Execute only on client after mount
    if (import.meta.client) {
      // Fire and forget - we don't await or handle errors in UI
      execute().catch((error) => {
        // Log error for debugging but don't disrupt user experience
        console.error(`Failed to update ${entityType} view count:`, error)
      })
    }
  }

  return {
    trackView,
  }
}
