interface SearchResultClick {
  queryId?: string | null
  resultId: number | string
  resultType: 'product' | 'blog_post'
  position: number
}

/**
 * Fire-and-forget attribution of a search-result click to the query
 * that produced it. Feeds the backend's click-through ranking signal
 * and search analytics.
 *
 * `keepalive: true` lets the request survive the navigation the click
 * triggers; failures are swallowed — tracking must never affect UX.
 */
export function useSearchClickTracking() {
  const trackResultClick = (click: SearchResultClick) => {
    if (!import.meta.client || !click.queryId) return
    $fetch('/api/search/click', {
      method: 'POST',
      body: {
        queryId: click.queryId,
        resultId: String(click.resultId),
        resultType: click.resultType,
        position: click.position,
      },
      keepalive: true,
    }).catch(() => {})
  }

  return { trackResultClick }
}
