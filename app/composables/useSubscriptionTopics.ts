/**
 * Composable for subscription topics API interactions
 *
 * Uses Nuxt's useAsyncData for SSR-safe data fetching with automatic caching,
 * deduplication, and payload forwarding from server to client.
 *
 * Provides access to subscription topics with helper methods for filtering
 * and grouping by category.
 */
export function useSubscriptionTopics() {
  /**
   * Fetch all subscription topics
   *
   * Uses useAsyncData for SSR support and automatic caching.
   * Returns the complete AsyncData result with data, status, error, and refresh.
   */
  const fetchTopics = () => {
    return useAsyncData<SubscriptionTopic[]>(
      'subscription:topics:list',
      async () => {
        const response = await $fetch('/api/subscriptions/topics', {
          method: 'GET',
          headers: useRequestHeaders(),
        })
        return response?.results || []
      },
    )
  }

  /**
   * Helper function to get a topic by ID from a topics array
   *
   * @param topics - Array of subscription topics
   * @param id - Topic ID to find
   * @returns The matching topic or undefined
   */
  const getTopicById = (topics: SubscriptionTopic[] | null, id: number) => {
    return topics?.find(topic => topic.id === id)
  }

  /**
   * Helper function to group topics by category
   *
   * @param topics - Array of subscription topics
   * @returns Object with categories as keys and topic arrays as values
   */
  const groupByCategory = (topics: SubscriptionTopic[] | null | undefined) => {
    const grouped: Record<string, SubscriptionTopic[]> = {}

    if (!topics) {
      return grouped
    }

    topics.forEach((topic) => {
      const category = topic.category || 'OTHER'
      if (!grouped[category]) {
        grouped[category] = []
      }
      grouped[category].push(topic)
    })

    return grouped
  }

  return {
    fetchTopics,
    getTopicById,
    groupByCategory,
  }
}
