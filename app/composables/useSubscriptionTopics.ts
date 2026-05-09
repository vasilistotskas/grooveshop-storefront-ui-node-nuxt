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
    // Forward the browser cookie so the SSR-side ``$fetch`` to our own
    // Nuxt server route inherits the user's encrypted nuxt-session
    // cookie. Without this header, the server-to-server call lands at
    // ``/api/subscriptions/topics`` anonymously and the route's
    // ``requireAllAuthAccessToken`` throws 401 — even when the browser
    // is logged in. The 'cookie' header is the only one we need to
    // surface; we deliberately don't forward the rest (e.g. range,
    // if-none-match) which would break Nuxt's payload-cache hash.
    const headers = useRequestHeaders(['cookie'])
    return useAsyncData<SubscriptionTopic[]>(
      'subscription:topics:list',
      async () => {
        const response = await $fetch('/api/subscriptions/topics', {
          method: 'GET',
          headers,
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
