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
  // useRequestFetch forwards the incoming HOST (and cookie) during SSR.
  // Selecting only 'cookie' kept auth working but dropped the host, so
  // Nitro stamped host: "localhost" on the internal request and
  // server/middleware/0.tenant.ts answered 404 "Store not found" —
  // silently, because callers fall back to a default. Declared in setup
  // scope: useRequestFetch reads the request event through useNuxtApp(),
  // which is unavailable past an await boundary.
  const requestFetch = useRequestFetch()

  /**
   * Fetch all subscription topics
   *
   * Uses useAsyncData for SSR support and automatic caching.
   * Returns the complete AsyncData result with data, status, error, and refresh.
   */
  const fetchTopics = () => {
    // The forwarded cookie is what lets the SSR-side call inherit the
    // encrypted nuxt-session cookie; without it the request lands
    // anonymously and ``requireAllAuthAccessToken`` throws 401 even
    // though the browser is logged in.
    return useAsyncData<SubscriptionTopic[]>(
      'subscription:topics:list',
      async () => {
        const response = await requestFetch('/api/subscriptions/topics', {
          method: 'GET',
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
