/**
 * Composable for user subscriptions API interactions
 *
 * Uses Nuxt's useAsyncData for SSR-safe data fetching with automatic caching,
 * deduplication, and payload forwarding from server to client.
 *
 * Provides access to user subscriptions with mutation operations for
 * subscribing and unsubscribing.
 */
export function useUserSubscriptions() {
  const toast = useToast()
  const { $i18n } = useNuxtApp()
  const t = $i18n.t.bind($i18n)

  // useRequestFetch forwards the incoming HOST (and cookie) during
  // SSR. Selecting only 'cookie' kept auth working but dropped the
  // host, so Nitro stamped host: "localhost" on the internal request
  // and server/middleware/0.tenant.ts answered 404 "Store not found" —
  // silently, because callers fall back to a default. Declared in
  // setup scope: useRequestFetch reads the request event through
  // useNuxtApp(), which is unavailable past an await boundary.
  const requestFetch = useRequestApi()

  /**
   * Fetch user subscriptions
   *
   * Uses useAsyncData for SSR support and automatic caching.
   * Returns the complete AsyncData result with data, status, error, and refresh.
   */
  const fetchSubscriptions = () => {
    // Forward the browser cookie during SSR so the internal $fetch to
    // /api/subscriptions/user inherits the encrypted nuxt-session
    // cookie. See useSubscriptionTopics.fetchTopics for the same fix.
    return useAsyncData<UserSubscription[]>(
      'subscription:user:list',
      async () => {
        const response = await requestFetch('/api/subscriptions/user', {
          method: 'GET',
        })
        return response?.results || []
      },
    )
  }

  /**
   * Subscribe to a topic, through Django's topic action: it applies the
   * topic's confirmation rule and re-arms an UNSUBSCRIBED or BOUNCED
   * subscription, where creating a row bypassed the first and collided
   * with the second. A topic that asks for confirmation answers PENDING —
   * the shopper has an email to click, and the toast says so.
   *
   * @param topicId - ID of the topic to subscribe to
   * @returns The subscription, ACTIVE or PENDING
   */
  const subscribe = async (topicId: number) => {
    try {
      const response = await requestFetch(`/api/subscriptions/topics/${topicId}/subscribe`, {
        method: 'POST',
      })

      // Invalidate caches to refresh UI
      await Promise.all([
        refreshNuxtData('subscription:user:list'),
        refreshNuxtData('subscription:topics:list'),
      ])

      const outcome = response?.status === 'PENDING' ? 'pending' : 'success'
      toast.add({
        title: t(`subscription_notifications.subscribe.${outcome}_title`),
        description: t(`subscription_notifications.subscribe.${outcome}_description`),
        color: 'success',
      })

      return response
    }
    catch (err) {
      // A refusal usually means the list was stale (another tab, an
      // email's confirmation link): read it again so the switch shows
      // what is true rather than what was asked.
      await refreshNuxtData('subscription:user:list')
      toast.add({
        title: t('subscription_notifications.subscribe.error_title'),
        description: t('subscription_notifications.subscribe.error_description'),
        color: 'error',
      })
      throw err
    }
  }

  /**
   * Unsubscribe from a topic
   *
   * Deletes a subscription and invalidates related caches to ensure
   * the UI reflects the updated subscription state.
   *
   * @param subscriptionId - ID of the subscription to delete
   */
  const unsubscribe = async (subscriptionId: number) => {
    try {
      await requestFetch(`/api/subscriptions/user/${subscriptionId}`, {
        method: 'DELETE',
      })

      // Invalidate caches to refresh UI
      await Promise.all([
        refreshNuxtData('subscription:user:list'),
        refreshNuxtData('subscription:topics:list'),
      ])

      toast.add({
        title: t('subscription_notifications.unsubscribe.success_title'),
        description: t('subscription_notifications.unsubscribe.success_description'),
        color: 'success',
      })
    }
    catch (err) {
      // A refusal usually means the list was stale (another tab, an
      // email's confirmation link): read it again so the switch shows
      // what is true rather than what was asked.
      await refreshNuxtData('subscription:user:list')
      toast.add({
        title: t('subscription_notifications.unsubscribe.error_title'),
        description: t('subscription_notifications.unsubscribe.error_description'),
        color: 'error',
      })
      throw err
    }
  }

  /**
   * Whether the shopper's subscription to a topic stands: ACTIVE, or
   * PENDING their confirmation. An UNSUBSCRIBED (an email's unsubscribe
   * link) or BOUNCED row is kept by Django but is no subscription.
   */
  const isSubscribed = (subscriptions: UserSubscription[] | null, topicId: number) => {
    return subscriptions?.some(sub => sub.topic === topicId && (sub.status === 'ACTIVE' || sub.status === 'PENDING')) || false
  }

  /**
   * Helper function to get subscription by topic ID
   *
   * @param subscriptions - Array of user subscriptions
   * @param topicId - Topic ID to find
   * @returns The matching subscription or undefined
   */
  const getSubscriptionByTopicId = (subscriptions: UserSubscription[] | null, topicId: number) => {
    return subscriptions?.find(sub => sub.topic === topicId)
  }

  return {
    fetchSubscriptions,
    subscribe,
    unsubscribe,
    isSubscribed,
    getSubscriptionByTopicId,
  }
}
