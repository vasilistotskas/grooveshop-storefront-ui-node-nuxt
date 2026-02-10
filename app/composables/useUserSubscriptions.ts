/**
 * Composable for user subscriptions API interactions
 *
 * Uses Nuxt's useAsyncData for SSR-safe data fetching with automatic caching,
 * deduplication, and payload forwarding from server to client.
 *
 * Provides access to user subscriptions with mutation operations for
 * subscribing, unsubscribing, and bulk operations.
 */
export function useUserSubscriptions() {
  const toast = useToast()
  const { $i18n } = useNuxtApp()

  /**
   * Fetch user subscriptions
   *
   * Uses useAsyncData for SSR support and automatic caching.
   * Returns the complete AsyncData result with data, status, error, and refresh.
   */
  const fetchSubscriptions = () => {
    return useAsyncData<UserSubscription[]>(
      'subscription:user:list',
      async () => {
        const response = await $fetch('/api/subscriptions/user', {
          method: 'GET',
          headers: useRequestHeaders(),
        })
        return response?.results || []
      },
    )
  }

  /**
   * Subscribe to a topic
   *
   * Creates a new subscription and invalidates related caches to ensure
   * the UI reflects the updated subscription state.
   *
   * @param topicId - ID of the topic to subscribe to
   * @returns The created subscription
   */
  const subscribe = async (topicId: number) => {
    try {
      const response = await $fetch('/api/subscriptions/user', {
        method: 'POST',
        body: { topic: topicId },
      })

      // Invalidate caches to refresh UI
      await Promise.all([
        refreshNuxtData('subscription:user:list'),
        refreshNuxtData('subscription:topics:list'),
      ])

      toast.add({
        title: $i18n.t('subscription_notifications.subscribe.success_title'),
        description: $i18n.t('subscription_notifications.subscribe.success_description'),
        color: 'success',
      })

      return response
    }
    catch (err) {
      toast.add({
        title: $i18n.t('subscription_notifications.subscribe.error_title'),
        description: $i18n.t('subscription_notifications.subscribe.error_description'),
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
      await $fetch(`/api/subscriptions/user/${subscriptionId}`, {
        method: 'DELETE',
      })

      // Invalidate caches to refresh UI
      await Promise.all([
        refreshNuxtData('subscription:user:list'),
        refreshNuxtData('subscription:topics:list'),
      ])

      toast.add({
        title: $i18n.t('subscription_notifications.unsubscribe.success_title'),
        description: $i18n.t('subscription_notifications.unsubscribe.success_description'),
        color: 'success',
      })
    }
    catch (err) {
      toast.add({
        title: $i18n.t('subscription_notifications.unsubscribe.error_title'),
        description: $i18n.t('subscription_notifications.unsubscribe.error_description'),
        color: 'error',
      })
      throw err
    }
  }

  /**
   * Bulk subscribe or unsubscribe from multiple topics
   *
   * Performs bulk subscription operations and invalidates related caches
   * to ensure the UI reflects the updated subscription state.
   *
   * @param topicIds - Array of topic IDs to operate on
   * @param action - Action to perform ('subscribe' or 'unsubscribe')
   * @returns The bulk operation response
   */
  const bulkSubscribe = async (topicIds: number[], action: 'subscribe' | 'unsubscribe') => {
    try {
      const response = await $fetch('/api/subscriptions/user/bulk-subscribe', {
        method: 'POST',
        body: { topicIds, action },
      })

      // Invalidate caches to refresh UI
      await Promise.all([
        refreshNuxtData('subscription:user:list'),
        refreshNuxtData('subscription:topics:list'),
      ])

      toast.add({
        title: action === 'subscribe'
          ? $i18n.t('subscription_notifications.bulk_subscribe.success_title')
          : $i18n.t('subscription_notifications.bulk_unsubscribe.success_title'),
        description: action === 'subscribe'
          ? $i18n.t('subscription_notifications.bulk_subscribe.success_description')
          : $i18n.t('subscription_notifications.bulk_unsubscribe.success_description'),
        color: 'success',
      })

      return response
    }
    catch (err) {
      toast.add({
        title: $i18n.t('subscription_notifications.bulk_operation.error_title'),
        description: $i18n.t('subscription_notifications.bulk_operation.error_description'),
        color: 'error',
      })
      throw err
    }
  }

  /**
   * Helper function to check if user is subscribed to a topic
   *
   * @param subscriptions - Array of user subscriptions
   * @param topicId - Topic ID to check
   * @returns True if user is subscribed and active
   */
  const isSubscribed = (subscriptions: UserSubscription[] | null, topicId: number) => {
    return subscriptions?.some(sub => sub.topic === topicId && sub.status === 'ACTIVE') || false
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
    bulkSubscribe,
    isSubscribed,
    getSubscriptionByTopicId,
  }
}
