/**
 * Middleware to check if loyalty system is enabled
 *
 * Redirects to home page if loyalty is disabled
 */
export default defineNuxtRouteMiddleware(async () => {
  const nuxtApp = useNuxtApp()
  try {
    const settings = await $fetch<{ LOYALTY_ENABLED?: string }>('/api/loyalty/settings', {
      query: { keys: 'LOYALTY_ENABLED' },
    })
    const enabled = (settings?.LOYALTY_ENABLED ?? 'false').toLowerCase() === 'true'
    if (!enabled) {
      const localePath = useLocalePath()
      return nuxtApp.runWithContext(() => navigateTo(localePath('index')))
    }
  }
  catch {
    // Fall through — don't block the page on a failed settings fetch
  }
})
