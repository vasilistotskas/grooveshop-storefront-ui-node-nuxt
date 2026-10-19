/**
 * Fire-and-forget feedback for a suggestion strip: one ``impression``
 * when the strip is actually shown, one ``click`` per tile followed —
 * the signals Django's nightly weight learning reads.
 * Both echo the ``impressionId`` the suggestions response minted so
 * the backend can tie click and attach back to the strategy that
 * earned them.
 *
 * `keepalive: true` lets the click survive the navigation it triggers;
 * failures are swallowed — tracking must never affect UX.
 */
export function useRecommendationTracking(surface: SurfaceEnum, seedId?: number) {
  const { remember } = useRecommendationAttribution()

  const post = (
    kind: RecommendationEventRequestKindEnum,
    impressionId: string,
    items: RecommendationEventItemRequest[],
  ) => {
    if (!import.meta.client || items.length === 0) return
    $api('/api/analytics/recommendation-event', {
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

  /**
   * Report the strip's impression once, the first time it is mounted
   * with something in it. A server-rendered strip has its answer in the
   * payload when it mounts — under `hydrate-on-visible`, when it
   * scrolls into view. A strip created by a client-side navigation
   * mounts at once (lazy hydration only delays hydrating server markup)
   * and its own fetch answers after: reporting only at mount lost every
   * one of those. Call from the strip's setup.
   */
  const trackImpressionWhenShown = (response: Ref<ApiV1RecommendationsRetrieveResponse | null>) => {
    let reported = false
    onMounted(() => {
      watch(response, (value) => {
        if (reported || !value?.impressionId || value.items.length === 0) return
        reported = true
        trackImpression(value.impressionId, value.items)
      }, { immediate: true })
    })
  }

  const trackClick = (impressionId: string, item: RecommendationItem, position: number) => {
    // The add-to-cart that follows this click carries the impression
    // to the backend — the exact, identity-free attach path.
    remember(item.product.id, impressionId)
    post('click', impressionId, [{
      productId: item.product.id,
      strategy: item.reason.strategy,
      position,
    }])
  }

  return { trackImpression, trackImpressionWhenShown, trackClick }
}
