/**
 * Fire-and-forget feedback for a suggestion strip: one ``impression``
 * when the strip is actually shown, one ``click`` per tile followed.
 * Both echo the ``impressionId`` the suggestions response minted so
 * the backend can tie click and attach back to the strategy that
 * earned them.
 *
 * `keepalive: true` lets the click survive the navigation it triggers;
 * failures are swallowed — tracking must never affect UX.
 */
export function useRecommendationTracking(surface: SurfaceEnum, seedId?: number) {
  const post = (
    kind: RecommendationEventRequestKindEnum,
    impressionId: string,
    items: RecommendationEventItemRequest[],
  ) => {
    if (!import.meta.client || items.length === 0) return
    $fetch('/api/analytics/recommendation-event', {
      method: 'POST',
      body: {
        impressionId,
        surface,
        kind,
        ...(typeof seedId === 'number' ? { seedId } : {}),
        items,
      },
      keepalive: true,
    }).catch(() => {})
  }

  const trackImpression = (impressionId: string, items: readonly RecommendationItem[]) => {
    post('impression', impressionId, items.map((item, position) => ({
      productId: item.product.id,
      strategy: item.reason.strategy,
      position,
    })))
  }

  const trackClick = (impressionId: string, item: RecommendationItem, position: number) => {
    post('click', impressionId, [{
      productId: item.product.id,
      strategy: item.reason.strategy,
      position,
    }])
  }

  return { trackImpression, trackClick }
}
