/**
 * Fire-and-forget feedback for a suggestion strip: one ``impression``
 * when the strip is actually shown, one ``click`` per tile followed —
 * the signals Django's nightly weight learning reads.
 *
 * An impression is one showing, and Django mints its id when the
 * impression is reported: the suggestions body cannot carry it, because
 * Nitro caches that body and the edge caches the page it is drawn into,
 * so every viewer of a cached copy would share one id. The impression
 * beacon is the first request that is this viewer's alone, so it goes
 * out with no id, and the id its answer names is the one this strip's
 * clicks carry and the add-to-cart after a click sends on.
 *
 * `keepalive: true` lets the click survive the navigation it triggers;
 * failures are swallowed — tracking must never affect UX.
 */
export function useRecommendationTracking(surface: SurfaceEnum, seedId?: number) {
  const { remember } = useRecommendationAttribution()
  // The id Django minted for this showing, once the impression is
  // answered; undefined while none was reported or the report failed.
  let showing: Promise<string | undefined> = Promise.resolve(undefined)

  const post = (
    kind: RecommendationEventRequestKindEnum,
    items: RecommendationEventItemRequest[],
    impressionId?: string,
  ): Promise<string | undefined> => {
    if (!import.meta.client || items.length === 0) return Promise.resolve(undefined)
    return $api('/api/analytics/recommendation-event', {
      method: 'POST',
      body: {
        ...(impressionId ? { impressionId } : {}),
        surface,
        kind,
        ...(typeof seedId === 'number' ? { seedId } : {}),
        items,
      },
      keepalive: true,
    })
      .then(answer => answer.impressionId)
      .catch(() => undefined)
  }

  const trackImpression = (items: readonly RecommendationItem[]) => {
    showing = post('impression', items.map((item, position) => ({
      productId: item.product.id,
      strategy: item.reason.strategy,
      position,
    })))
  }

  /**
   * Report an impression for what the strip shows: once it is mounted with
   * something in it, and again when what it shows changes (the cart's strip
   * answers for another basket), which is another showing. A server-rendered strip has its answer in the
   * payload when it mounts — under `hydrate-on-visible`, when it
   * scrolls into view. A strip created by a client-side navigation
   * mounts at once (lazy hydration only delays hydrating server markup)
   * and its own fetch answers after: reporting only at mount lost every
   * one of those. Call from the strip's setup.
   */
  const trackImpressionWhenShown = (response: Ref<ApiV1RecommendationsRetrieveResponse | null>) => {
    let reported = ''
    onMounted(() => {
      watch(response, (value) => {
        const shown = value?.items.map(item => item.product.id).join() ?? ''
        if (!value || !shown || shown === reported) return
        reported = shown
        trackImpression(value.items)
      }, { immediate: true })
    })
  }

  /**
   * A tile was followed. Its click names the showing, so it waits for the
   * impression's answer; a showing whose impression was never recorded
   * has no id to name, and its click is not reported.
   */
  const trackClick = async (item: RecommendationItem, position: number) => {
    // The add-to-cart that follows this click carries the impression
    // to the backend — the exact, identity-free attach path. Before the
    // wait: that add-to-cart may be this very click's.
    remember(item.product.id, showing)
    const impressionId = await showing
    if (!impressionId) return
    await post('click', [{
      productId: item.product.id,
      strategy: item.reason.strategy,
      position,
    }], impressionId)
  }

  return { trackImpression, trackImpressionWhenShown, trackClick }
}
