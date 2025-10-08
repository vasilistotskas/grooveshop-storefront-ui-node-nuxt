export function useSubscriptionTopics() {
  const topics = ref<SubscriptionTopic[]>([])
  const loading = ref(true)
  const error = ref<Error | null>(null)

  const fetchTopics = async () => {
    loading.value = true
    error.value = null
    try {
      const response = await $fetch('/api/subscriptions/topics', {
        method: 'GET',
      })
      topics.value = response?.results || []
    }
    catch (err) {
      error.value = err instanceof Error ? err : new Error('Failed to fetch topics')
      console.error('Error fetching subscription topics:', err)
    }
    finally {
      loading.value = false
    }
  }

  const getTopicById = (id: number) => {
    return topics.value.find(topic => topic.id === id)
  }

  const groupedByCategory = computed(() => {
    const grouped: Record<string, SubscriptionTopic[]> = {}

    topics.value.forEach((topic) => {
      const category = topic.category || 'OTHER'
      if (!grouped[category]) {
        grouped[category] = []
      }
      grouped[category].push(topic)
    })

    return grouped
  })

  return {
    topics,
    loading,
    error,
    fetchTopics,
    getTopicById,
    groupedByCategory,
  }
}
