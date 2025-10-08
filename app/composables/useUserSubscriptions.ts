export function useUserSubscriptions() {
  const subscriptions = ref<UserSubscription[]>([])
  const loading = ref(true)
  const error = ref<Error | null>(null)
  const toast = useToast()
  const { $i18n } = useNuxtApp()

  const fetchSubscriptions = async () => {
    loading.value = true
    error.value = null
    try {
      const response = await $fetch('/api/subscriptions/user', {
        method: 'GET',
      })
      subscriptions.value = response?.results || []
    }
    catch (err) {
      error.value = err instanceof Error ? err : new Error('Failed to fetch subscriptions')
      console.error('Error fetching user subscriptions:', err)
    }
    finally {
      loading.value = false
    }
  }

  const subscribe = async (topicId: number) => {
    loading.value = true
    error.value = null
    try {
      const response = await $fetch('/api/subscriptions/user', {
        method: 'POST',
        body: { topic: topicId },
      })
      if (response) {
        subscriptions.value.push(response)
      }
      toast.add({
        title: $i18n.t('subscription_notifications.subscribe.success_title'),
        description: $i18n.t('subscription_notifications.subscribe.success_description'),
        color: 'success',
      })
      return response
    }
    catch (err) {
      error.value = err instanceof Error ? err : new Error('Failed to subscribe')
      toast.add({
        title: $i18n.t('subscription_notifications.subscribe.error_title'),
        description: $i18n.t('subscription_notifications.subscribe.error_description'),
        color: 'error',
      })
      throw err
    }
    finally {
      loading.value = false
    }
  }

  const unsubscribe = async (subscriptionId: number) => {
    loading.value = true
    error.value = null
    try {
      await $fetch(`/api/subscriptions/user/${subscriptionId}`, {
        method: 'DELETE',
      })
      subscriptions.value = subscriptions.value.filter(sub => sub.id !== subscriptionId)
      toast.add({
        title: $i18n.t('subscription_notifications.unsubscribe.success_title'),
        description: $i18n.t('subscription_notifications.unsubscribe.success_description'),
        color: 'success',
      })
    }
    catch (err) {
      error.value = err instanceof Error ? err : new Error('Failed to unsubscribe')
      toast.add({
        title: $i18n.t('subscription_notifications.unsubscribe.error_title'),
        description: $i18n.t('subscription_notifications.unsubscribe.error_description'),
        color: 'error',
      })
      throw err
    }
    finally {
      loading.value = false
    }
  }

  const bulkSubscribe = async (topicIds: number[], action: 'subscribe' | 'unsubscribe') => {
    loading.value = true
    error.value = null
    try {
      const response = await $fetch('/api/subscriptions/user/bulk-subscribe', {
        method: 'POST',
        body: { topicIds, action },
      })

      await fetchSubscriptions()

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
      error.value = err instanceof Error ? err : new Error('Failed to perform bulk operation')
      toast.add({
        title: $i18n.t('subscription_notifications.bulk_operation.error_title'),
        description: $i18n.t('subscription_notifications.bulk_operation.error_description'),
        color: 'error',
      })
      throw err
    }
    finally {
      loading.value = false
    }
  }

  const isSubscribed = computed(() => {
    return (topicId: number) => {
      return subscriptions.value.some(sub => sub.topic === topicId && sub.status === 'ACTIVE')
    }
  })

  const getSubscriptionByTopicId = (topicId: number) => {
    return subscriptions.value.find(sub => sub.topic === topicId)
  }

  return {
    subscriptions,
    loading,
    error,
    fetchSubscriptions,
    subscribe,
    unsubscribe,
    bulkSubscribe,
    isSubscribed,
    getSubscriptionByTopicId,
  }
}
